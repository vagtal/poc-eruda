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
    listeners = {}

    constructor() {
        document.addEventListener('keydown', async(event) => {
            try {
                await Object.getOwnPropertyNames(this.listeners)?.forEach(async (section) => {
                    if (this.listeners[section]?.keyboardListening) {
                        await this.listeners[section]?.listeningFn(event)
                    }
                })
            } catch (err) {
                console.error(err)
            }
        })
    }

    addSection(section, listeningFn) {
        this.listeners[section] = {
            keyboardListening: false,
            listeningFn
        }
    }
}

export const keybindManager = new keyBinds()