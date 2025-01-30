export function getQuerySelector(query, getAll = false) {
    const queryType = getAll ? 'querySelectorAll' : 'querySelector'
    const element = document[queryType](query)
    return ((getAll && element?.length) || (!getAll && element)) ? element : (document.getElementById('eruda')?.shadowRoot && document.getElementById('eruda')?.shadowRoot[queryType](query))
}
  
export function toValidJSONOrString(input) {
    try {
        JSON.parse(input);
        return input;
    } catch {
        try {
            const wrappedKeys = input.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
            const normalizedQuotes = wrappedKeys.replace(/'([^']*)'/g, '"$1"');
            JSON.parse(normalizedQuotes);
            return normalizedQuotes;
        } catch {
            return input;
        }
    }
}

 class keyBinds {
    elements = {
        checkElementsKeyboard: false,
        elementstListennerFN: undefined
    }

    constructor() {
        document.addEventListener('keydown', async(event) => {
            try {               
                if (this.elements.checkElementsKeyboard) {
                    await this.elements.elementstListennerFN(event)
                }
            } catch (err) {
                console.error(err)
            }
        })
    }
}

export const keybindManager = new keyBinds()