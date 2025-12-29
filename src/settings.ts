import { App, PluginSettingTab, Setting } from "obsidian";
import SageMathPlugin from "./main";

export interface SageMathPluginSettings {
	serverUrl: string;
}

export const DEFAULT_SETTINGS: SageMathPluginSettings = {
	serverUrl: 'https://sagecell.sagemath.org/',
}

export class SageMathSettingTab extends PluginSettingTab {
	plugin: SageMathPlugin;

	constructor(app: App, plugin: SageMathPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('SageMath Server URL')
			.setDesc('Server to run SageMath commands. Uses the public SageMathCell server by default.')
			.addText(text => text
				.setPlaceholder('https://sagecell.sagemath.org/')
				.setValue(this.plugin.settings.serverUrl)
				.onChange(async (value) => {
					this.plugin.settings.serverUrl = value;
					await this.plugin.saveSettings();
				}));
	}
}
