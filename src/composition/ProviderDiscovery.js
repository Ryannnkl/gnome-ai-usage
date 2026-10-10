export class ProviderDiscovery {
    constructor(commandLocator, directoryExists) {
        this.commandLocator = commandLocator;
        this.directoryExists = directoryExists;
    }

    discover(codexHome, codexConfigured = false,
        enabled = {codex: true, claude: true, antigravity: true}) {
        return {
            codex: enabled.codex && (codexConfigured || this.directoryExists(codexHome) ||
                Boolean(this.commandLocator.find('codex'))),
            claude: enabled.claude ? this.commandLocator.find('claude') : null,
            antigravity: enabled.antigravity ? this.commandLocator.find('agy') : null,
        };
    }
}
