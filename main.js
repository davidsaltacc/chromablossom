
window.numberButton = (id, value) => {
    const input = document.querySelector("#number-input-" + id); 
    input.value = parseFloat(input.value) + parseFloat(value); // TODO see how many decimal places where present before, then round to that many (avoids .9999999999997 fpe)
    input.dispatchEvent(new Event("change"));
}

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

const canvas = document.querySelector("#canvas");
setupCB(canvas).then(cbContext => {

    cbContext.drawToCanvas();

    setupNumberInput("maximum-iterations", () => cbContext.getMaxIterations(), value => { cbContext.setMaxIterations(value); cbContext.drawToCanvas(); });
    setupNumberInput("sample-count", () => cbContext.getSampleCount(), value => { cbContext.setSampleCount(value); cbContext.drawToCanvas(); });
    setupNumberInput("radius", () => cbContext.getRadius(), value => { cbContext.setRadius(value); cbContext.drawToCanvas(); });
    setupNumberInput("a", () => cbContext.getA(), value => { cbContext.setA(value); cbContext.drawToCanvas(); });
    setupNumberInput("b", () => cbContext.getB(), value => { cbContext.setB(value); cbContext.drawToCanvas(); });
    setupNumberInput("c", () => cbContext.getC(), value => { cbContext.setC(value); cbContext.drawToCanvas(); });
    setupNumberInput("d", () => cbContext.getD(), value => { cbContext.setD(value); cbContext.drawToCanvas(); });
    setupNumberInput("e", () => cbContext.getE(), value => { cbContext.setE(value); cbContext.drawToCanvas(); }); // TODO explore with around 6. interesting stuff i think
    setupNumberInput("f", () => cbContext.getF(), value => { cbContext.setF(value); cbContext.drawToCanvas(); }); 
    setupNumberInput("g", () => cbContext.getG(), value => { cbContext.setG(value); cbContext.drawToCanvas(); }); 

});