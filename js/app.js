/**
 * Fill the form with example data.
 *
 * @param empty if true, will clear all form inputs.
 */
function fillForm(empty=false) {
    const EXAMPLE_DATA = {
        ingestDomain: "push.example.com",
        ingestValidationKey: "ingestkey",
        streamDomain: "pull.example.com",
        streamValidationKey: "streamkey",
        transcodingTemplates: "lhd,lud,lsd",
        appName: "live",
        streamName: "123"
    }
    for (const prop in EXAMPLE_DATA) {
        let value = ''
        if (!empty) value = EXAMPLE_DATA[prop]
        document.getElementById(prop).value = value
    }
}

/**
 * Convert a integer to a hexadecimal string with at least two characters
 * Source: https://stackoverflow.com/a/27747377/2014507
 *
 * @param dec integer, e.g. 10
 * @returns hex string, e.g. '0a'
 */
function dec2hex(dec) {
    return dec.toString(16).padStart(2, "0")
}

/**
 * Generates a random hexadecimal string with given length
 * Source: https://stackoverflow.com/a/27747377/2014507
 *
 * @param len output string length
 * @returns random hexadecimal string
 */
function generateId(len) {
    var arr = new Uint8Array((len || 40) / 2)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, dec2hex).join('')
}

/**
 * Generates the auth_key parameter for URL Validation (signing method A)
 * Reference: https://support.huaweicloud.com/intl/en-us/usermanual-live/live_01_0049.html
 *
 * @param uri Live URI (without protocol), e.g. "/live/123"
 * @param key URL Validation Key
 * @returns empty string if no key is given, otherwise auth_key string.
 */
function generateAuthKey(uri, key) {
    if (key.length == 0) {
        return ''
    }

    let timestamp = Math.floor(Date.now() / 1000).toString()
    let randomText = generateId(16)

    let authFirstPart = timestamp + '-' + randomText + '-0-'

    let hashInput = uri + '-' + authFirstPart + key
    let hash = CryptoJS.MD5(hashInput).toString()

    console.log("MD5('"+ hashInput +"') = " + hash)

    return '?auth_key=' + authFirstPart + hash
}

/**
 * Called when clicking "Generate URLs" (form submission)
 *
 * @param e onSubmit event
 * @returns False
 */
function processForm(e) {
    // stop event chain
    if (e.preventDefault) e.preventDefault();

    const PARAM_KEYS = [
        "ingestDomain", "ingestValidationKey",
        "streamDomain", "streamValidationKey",
        "transcodingTemplates", "appName",
        "streamName"
    ]

    // load form data into inputData object
    let inputData = {};
    PARAM_KEYS.forEach(function (key) {
        inputData[key] = document.getElementById(key).value
    })

    // -------------------
    // generate ingest URL
    let ingestUrl = '/' + inputData.appName + '/' + inputData.streamName
    let authKey = generateAuthKey(ingestUrl, inputData.ingestValidationKey)
    ingestUrl = 'rtmp://' + inputData.ingestDomain + ingestUrl + authKey

    // -------------------
    // generate stream URLs, for each protocol (rtmp, http)
    // and each "extension" (flv, m3u8)
    const PROTOCOLS = {
        'rtmp': [''],
        'http': ['.flv', '.m3u8']
    }

    // transcoding template IDs are processed as variations of stream URLs.
    // the default template ID is empty, that is, no transcoding applied
    let transcodingTemplates = ['']

    // remove spaces and split by comma
    let usedTranscodings = inputData.transcodingTemplates.replace(' ', '')
    usedTranscodings = usedTranscodings.split(',')
    usedTranscodings.forEach(function (transc) {
        // ignore if no transcoding template ID was provided
        if (transc.length > 0) {
            transcodingTemplates.push('_' + transc)
        }
    })

    let streamUrls = []

    // for each protocol...
    for (const protocol in PROTOCOLS) {
        let extensions = PROTOCOLS[protocol]
        let baseStreamUrl = '/' + inputData.appName + '/' + inputData.streamName

        // for each extension...
        extensions.forEach(function (ext) {
            // for each template ID...
            transcodingTemplates.forEach(function (transc) {
                // generate stream URL
                let streamUrl = baseStreamUrl + transc + ext
                let authKey = generateAuthKey(
                    streamUrl, inputData.streamValidationKey)
                streamUrl = protocol + '://' + inputData.streamDomain + streamUrl + authKey
                streamUrls.push(streamUrl)
            })
            streamUrls.push('')     // add empty line
        })
    }

    let outputLinks = "----- Stream URLs:\n"
    streamUrls.forEach(function (value) {
        outputLinks += value + "\n"
    })

    outputLinks += "\n----- Ingest URL:\n" + ingestUrl

    document.getElementById("outputLinks").innerHTML = outputLinks

    return false;
}


/**
 * Attach callback to form submission
 */
var form = document.getElementById('inputForm');
if (form.attachEvent) {
    form.attachEvent("submit", processForm);
} else {
    form.addEventListener("submit", processForm);
}
