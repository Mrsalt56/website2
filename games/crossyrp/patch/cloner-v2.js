const ClonerLog= console.log;


const OriginalWindowOpen= window.open;
window.open= function() {
    ClonerLog(arguments);
}


const OriginalEval= eval;
ev4l= function() {
    ClonerLog("fx--ev4l--", arguments[0]);
    arguments[0]= arguments[0].replace("aHR0cHM6Ly9wb2tpLmNvbS9zaXRlbG9jaw==", "I3ViZzIzNQ==");
    arguments[0]= arguments[0].replace("'location'", "'xlocation'");
    arguments[0]= arguments[0].replace("document.location=", "document.location==");
    return OriginalEval.apply(this, arguments);
}


window.commercialBreak= function() {
    ClonerLog("cloner-v2.commercialBreak", arguments);
    return true;
}
document.referrer= "";


var l0cati0n= new Proxy(location, {
    get: function(target, property, receiver) {
        ClonerLog(`l0cati0n.get.property--${property}--`);
        let targetObj = target[property];
        if (typeof targetObj == "function") {
            return (...args) => target[property].apply(target, args);
        } else {
            if (property== "host" || property=="hostname") {
                return "localhost";
            }
            if (property== "href") {
                return "https://localhost/";
            }
            if (property== "origin") {
                return "https://localhost/";
            }
            return targetObj;
        }
    },
    set: function(target, property, receiver) {
        ClonerLog(`l0cati0n.set.property--${property}--${receiver}--`);
        return true;
    }
});


// Analytics JS
function loadJS(FILE_URL, async = true) {
    let scriptEle = document.createElement("script");

    scriptEle.setAttribute("src", FILE_URL);
    scriptEle.setAttribute("type", "text/javascript");
    scriptEle.setAttribute("async", async);

    document.body.appendChild(scriptEle);

    // Success
    scriptEle.addEventListener("load", () => {
        console.log("ubg235 served!");
    });

     // Error
    scriptEle.addEventListener("error", () => {
        console.log("ubg235 error!");
    });
}


window.addEventListener("load", function () {
    loadJS("https://ubg235.pages.dev/js/ubg235_game_v1.js", true);
});
