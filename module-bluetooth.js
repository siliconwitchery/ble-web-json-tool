// var device;
var device = null;
var characteristic = null;

var siliconwitcheryUUID = "48fd0000-184d-fe9e-e84d-bfc537115aab";
var superStackService   = "48fd0001-184d-fe9e-e84d-bfc537115aab";
var superStackCharDL    = "48fd0002-184d-fe9e-e84d-bfc537115aab";
var superStackCharUL    = "48fd0003-184d-fe9e-e84d-bfc537115aab";

// Function to check if bluetooth is availabe in the browser
function isWebBluetoothAvailable() {
    return new Promise((resolve, reject) => {
        navigator.bluetooth ? resolve() : reject("BLE not available");
    });
}

// Function to connect and disconnect, returning status
async function connectDisconnect() {
    try {
        // First make sure web bluetooth is available
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
                services:[superStackService]
            }]
        });

        const server = await device.gatt.connect();

        const service = await server.getPrimaryService(superStackService);

        const characteristic = await service.getCharacteristic(superStackCharDL);

        return Promise.resolve("unsecure");

    } catch (error) {
        return Promise.reject(error);
    }
}

// Function to transmit some data to the device
async function sendJSONData(unformattedJSON) {
    try {
        // Check the JSON is valid
        const formattedJSON = JSON.stringify(JSON.parse(unformattedJSON),
            undefined, 
            4);
        
        // Minify
        const minifiedJSON = JSON.stringify(JSON.parse(unformattedJSON));

        if (characteristic) {
            console.log(minifiedJSON); // <--- send this
        }

        // Return formatted JSON
        return Promise.resolve(formattedJSON);
    } catch {
        return Promise.reject();
    }
}