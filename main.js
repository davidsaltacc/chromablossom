
window.numberButton = (id, value) => {
    const input = document.querySelector("#number-input-" + id); 
    const maxDigitsBefore = Math.max(parseFloat(input.value).toString().split(".")[1]?.length ?? 0, parseFloat(value).toString().split(".")[1]?.length ?? 0);
    input.value = parseFloat((parseFloat(input.value) + parseFloat(value)).toFixed(maxDigitsBefore));
    input.dispatchEvent(new Event("change"));
};

function setupNumberInput(id, getter, setter) {
    const input = document.querySelector("#number-input-" + id); 
    input.value = getter();
    input.onchange = () => {
        const newValue = parseFloat(input.value);
        if (Number.isFinite(newValue)) {
            setter(newValue);
        } else {
            input.value = getter();
        }
    };
}

function setupBoolButton(id, getter, setter) {
    const buttonOn = document.querySelector("#bool-button-" + id + "-on");
    const buttonOff = document.querySelector("#bool-button-" + id + "-off");
    if (getter()) {
        buttonOn.setAttribute("disabled", "");
    } else {
        buttonOff.setAttribute("disabled", "");
    }
    buttonOn.onclick = () => {
        buttonOn.setAttribute("disabled", "");
        buttonOff.removeAttribute("disabled");
        setter(true);
    };
    buttonOff.onclick = () => {
        buttonOn.removeAttribute("disabled");
        buttonOff.setAttribute("disabled", "");
        setter(false);
    };
}

const canvas = document.querySelector("#canvas");

setupCB(canvas).then(cbContext => {

    var mousePos = [ 0, 0 ];
    var mouseRightClicked = false;

    function updateMouseCoords(evt) {
        const rect = evt.target.getBoundingClientRect();
        mousePos[0] = (2 * (evt.clientX - rect.left) - canvas.clientWidth) / Math.min(canvas.clientWidth, canvas.clientHeight);
        mousePos[1] = -(2 * (evt.clientY - rect.top) - canvas.clientHeight) / Math.min(canvas.clientWidth, canvas.clientHeight);
        mousePos[0] = mousePos[0] / cbContext.getZoom() + cbContext.getCenter()[0];
        mousePos[1] = mousePos[1] / cbContext.getZoom() + cbContext.getCenter()[1];
    }

    function onZoom(evt) {
        evt.preventDefault();
        var z = Math.exp(-evt.deltaY / 500);
        updateMouseCoords(evt);
        cbContext.setCenter([
            mousePos[0] + (cbContext.getCenter()[0] - mousePos[0]) / z,
            mousePos[1] + (cbContext.getCenter()[1] - mousePos[1]) / z
        ]);
        cbContext.setZoom(cbContext.getZoom() * z);
        cbContext.drawToCanvas();
    }

    function mouseDown(evt) {
        if (evt.button == 2) {
            mouseRightClicked = true;
        }
        updateMouseCoords(evt);
    }

    function mouseUp(evt) {
        if (evt.button == 2) {
            mouseRightClicked = false;
        }
    }

    function mouseMove(evt) {
        if (mouseRightClicked) {
            const oldX = mousePos[0];
            const oldY = mousePos[1];
            updateMouseCoords(evt);
            cbContext.setCenter([
                cbContext.getCenter()[0] + oldX - mousePos[0],
                cbContext.getCenter()[1] + oldY - mousePos[1]
            ]);
            updateMouseCoords(evt);
            cbContext.drawToCanvas();
        }
    }

    canvas.onwheel = onZoom;
    canvas.onmousedown = mouseDown;
    canvas.onmouseup = mouseUp;
    canvas.onmousemove = mouseMove;
    canvas.oncontextmenu = evt => evt.preventDefault();

    cbContext.drawToCanvas();

    setupNumberInput("canvas-size-x", () => canvas.width, value => { canvas.width = Math.max(value, 1); cbContext.drawToCanvas(); });
    setupNumberInput("canvas-size-y", () => canvas.height, value => { canvas.height = Math.max(value, 1); cbContext.drawToCanvas(); });
    setupNumberInput("maximum-iterations", () => cbContext.getMaxIterations(), value => { cbContext.setMaxIterations(value); cbContext.drawToCanvas(); });
    setupNumberInput("sample-count", () => cbContext.getSampleCount(), value => { cbContext.setSampleCount(value); cbContext.drawToCanvas(); });
    setupNumberInput("radius", () => cbContext.getRadius(), value => { cbContext.setRadius(value); cbContext.drawToCanvas(); });
    setupNumberInput("a", () => cbContext.getA(), value => { cbContext.setA(value); cbContext.drawToCanvas(); });
    setupNumberInput("b", () => cbContext.getB(), value => { cbContext.setB(value); cbContext.drawToCanvas(); });
    setupNumberInput("c", () => cbContext.getC(), value => { cbContext.setC(value); cbContext.drawToCanvas(); });
    setupNumberInput("d", () => cbContext.getD(), value => { cbContext.setD(value); cbContext.drawToCanvas(); });
    setupNumberInput("e", () => cbContext.getE(), value => { cbContext.setE(value); cbContext.drawToCanvas(); });
    setupNumberInput("f", () => cbContext.getF(), value => { cbContext.setF(value); cbContext.drawToCanvas(); }); 
    setupNumberInput("g", () => cbContext.getG(), value => { cbContext.setG(value); cbContext.drawToCanvas(); }); 
    setupNumberInput("h", () => cbContext.getH(), value => { cbContext.setH(value); cbContext.drawToCanvas(); }); 
    setupNumberInput("i", () => cbContext.getI(), value => { cbContext.setI(value); cbContext.drawToCanvas(); }); 
    setupNumberInput("j", () => cbContext.getJ(), value => { cbContext.setJ(value); cbContext.drawToCanvas(); });
    setupBoolButton("skeleton", () => cbContext.getSkeleton(), value => { cbContext.setSkeleton(value); cbContext.drawToCanvas(); });
    setupBoolButton("skeleton-clamp-fix", () => cbContext.getSkeletonClampFix(), value => { cbContext.getSkeletonClampFix(value); cbContext.drawToCanvas(); });

});