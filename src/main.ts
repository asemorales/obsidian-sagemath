import { DEFAULT_SETTINGS, SageMathPluginSettings, SageMathSettingTab } from "./settings";
import { MarkdownView, Notice } from 'obsidian';
import { Plugin } from 'obsidian';
import Client from './client';
import { log, logWarning } from "logger";

export default class SageMathPlugin extends Plugin {
	settings: SageMathPluginSettings;
	client: Client;

	async onload() {
		log("Initialized plugin.");

		await this.loadSettings();
		this.initSettings();
		this.initCommands();

		this.app.workspace.onLayoutReady(() => {
			this.client = new Client(this.settings);
			this.configurePrism();
			this.loadMathJax();	
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<SageMathPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	initSettings() {
		this.addSettingTab(new SageMathSettingTab(this.app, this));
	}

	initCommands() {
		this.addCommand({
			id: 'execute-sage-cells',
			name: 'Execute all sage cells in the current document.',
			checkCallback: (checking: boolean): boolean | void => {
				if (checking) return this.getActiveView()?.getMode() === 'preview';
				this.executeCurrentDoc();
			}
		});
	}

	async executeCurrentDoc() {
		const activeView = this.getActiveView();
		if (!activeView) return;

		const currentMode = activeView.getMode();
		const contentEl = activeView.contentEl;
		if (currentMode !== 'preview') return;

		try {
			await this.client.connect();
		} catch (error) {
			new Notice("SageMath Integration could not connect to server.");
			return;
		}

		contentEl.querySelectorAll('code.is-loaded.language-sage').forEach((codeEl: HTMLElement) => {
			let outputEl = <HTMLElement>codeEl.parentNode?.parentNode?.querySelector('.sagecell-output');

			if (outputEl) outputEl.remove();
			outputEl = document.createElement('div');
			outputEl.className = 'sagecell-output';

			codeEl.parentNode?.parentNode?.insertBefore(outputEl, codeEl.nextSibling);
			this.client.enqueue(codeEl.innerText, outputEl);
		});

		this.client.send();
	}

	getActiveView = (): MarkdownView | null => {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	async configurePrism() {
		if (!window.Prism) {
			logWarning("Prism not yet loaded.");
			return;
		}

		if (!window.Prism.languages.python) {
			logWarning("Prism Python language not yet loaded. Sage blocks will not be highlighted.");
			return;
		}

		window.Prism.languages.sage = window.Prism.languages.python;
		window.Prism.highlightAll();
	}

	async loadMathJax() {
		if (!window.MathJax) {
			var scriptEl = document.createElement('script');
			scriptEl.type = 'text/javascript';
			scriptEl.src = '/lib/mathjax/tex-chtml-full.js';
			document.body.appendChild(scriptEl);
		}
	}
}
