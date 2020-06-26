// Global device and characteristic objects
var device = null;
var downlinkCharacteristic = null;
var uplinkCharacteristic = null;

// UUIDs for services and characteristics
var siliconwitcheryUUID = "48fd0000-184d-fe9e-e84d-bfc537115aab";
var superStackService = "48fd0001-184d-fe9e-e84d-bfc537115aab";
var superStackCharDL = "48fd0002-184d-fe9e-e84d-bfc537115aab";
var superStackCharUL = "48fd0003-184d-fe9e-e84d-bfc537115aab";

// Promise function to check if bluetooth is availabe in the browser
function isWebBluetoothAvailable() {
    return new Promise((resolve, reject) => {
        navigator.bluetooth ? resolve() : reject("BLE not available");
    });
}

// Function to connect and disconnect, returning status as promise
async function connectDisconnect() {
    try {
        // First ensure web bluetooth is available
        await isWebBluetoothAvailable();

        // Disconnect if connected
        if (device) {
            if (device.gatt.connected) {
                await device.gatt.disconnect();
                return Promise.resolve("disconnected");
            }
        }

        // Otherwise connect
        device = await navigator.bluetooth.requestDevice({
            filters: [{
                namePrefix: "SuperStack",
                services: [superStackService]
            }]
        });

        // Handler to watch for device being disconnected due to loss of connection
        device.addEventListener('gattserverdisconnected', disconnectHandler);

        // Connect to device and get primary service as well as characteristics
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(superStackService);
        downlinkCharacteristic = await service.getCharacteristic(superStackCharDL);
        uplinkCharacteristic = await service.getCharacteristic(superStackCharUL);

        // Start notifications on receving characteristic and crete handler
        await uplinkCharacteristic.startNotifications();
        uplinkCharacteristic.addEventListener('characteristicvaluechanged', uplinkNotificationHandler);

        // Connected as unsecure method
        return Promise.resolve("unsecure");

    } catch (error) {
        // Return error if there is any
        return Promise.reject(error);
    }
}

// Function to transmit data to the device. Takes JSON and also checks it
async function sendJSONData(unformattedJSON, allowBadJSON) {
    try {
        var formattedJSON = unformattedJSON
        var minifiedJSON = unformattedJSON;

        if (!allowBadJSON)
        {
            // Check if the JSON is valid
            formattedJSON = JSON.stringify(JSON.parse(unformattedJSON), undefined, 2);

            // Strip out all the whitespaces (minify) as this is what we will send
            minifiedJSON = JSON.stringify(JSON.parse(unformattedJSON));
        }

        // If the characteristic is available, we send the JSON
        if (downlinkCharacteristic) {
            // Add \r and \n to start and end of string
            minifiedJSON = ['\r', minifiedJSON, '\n'].join('');

            // Encode the string to array
            let encoder = new TextEncoder('utf-8');
            let sendMsg = encoder.encode(minifiedJSON);

            // Send the array
            await downlinkCharacteristic.writeValue(sendMsg);
        }

        // Return formatted JSON to print
        return Promise.resolve(formattedJSON);

    } catch {
        // Otherwise the JSON was invalid. Reject promise
        return Promise.reject();
    }
}

// Callback handling received data from bluetooth
function uplinkNotificationHandler(event) {

    // Decode the byte array into a string
    const decoder = new TextDecoder('utf-8');
    let value = event.target.value;
    let decodedString = decoder.decode(value);

    // Pass the returned JSON to the main window
    try {
        const formattedJSON = JSON.stringify(JSON.parse(decodedString), undefined, 2);
        updateResponseBox(formattedJSON);

    } catch {
        // If it couldn't parse, then it's invalid. Pass anyway to show user
        updateResponseBox("JSON Invalid: " + decodedString);
    }
}