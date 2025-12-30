import { v4 as uuidv4 } from 'uuid';
import OutputWriter from './output-writer';
import { requestUrl } from 'obsidian';
import { SageMathPluginSettings } from 'settings';
import SockJS from 'sockjs-client';

export default class Client {
    serverUrl: string;
    connected: boolean;
    sessionId: string | null;
    cellSessionId: string | null;
    webSocket: WebSocket | null;
    queue: string[];
    outputWriters: any;

    constructor(settings: SageMathPluginSettings) {
        this.connected = false;
        this.serverUrl = this.cleanServerUrl(settings.serverUrl);
        this.queue = [];
        this.outputWriters = {};
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.connected) {
                return reject();
            }

            this.sessionId = null;
            this.cellSessionId = uuidv4();
            this.webSocket = null;
            this.queue = [];
            this.outputWriters = {};

            console.log(`SageMath Integration: Attempting to connect to kernel.`);
            
            requestUrl({
                url: this.getKernelUrl(),
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then((response) => {
                this.connected = false;

                const data = response.json;
                if (!data || typeof data !== 'object') {
                    throw new Error("SageMath Integration: Response was not a valid JSON object.");
                }
                if (!data.id || !data.ws_url) {
                    throw new Error("SageMath Integration: Invalid kernel response format.");
                }

                this.sessionId = data.id;
                this.webSocket = new SockJS(this.getWebSocketUrl());
                this.webSocket.onopen = () => {
                    console.log(`SageMath Integration: Connected to ${data.ws_url} with kernel ID ${this.sessionId}`);
                    this.connected = true;
                    resolve();
                }

                this.webSocket.onmessage = (msg: MessageEvent) => { this.handleReply(msg); }

                this.webSocket.onclose = () => { this.disconnect(); }

                this.webSocket.onerror = (ev: ErrorEvent) => { 
                    console.error("SageMath Integration: Error in WebSocket connection:", ev);

                    if (!this.connected) {
                        reject(new Error("Connection failed during handshake."));
                    } else {
                        reject(new Error("Connection to SageMath lost."));
                    }

                    this.disconnect();
                };
            })
            .catch((e) => {
                console.error(`SageMath Integration: Failed to connect. Status: ${e.status}. Error: ${e}`);
                this.disconnect();
                reject(e);
            });
        });
    }

    enqueue(code: string, outputEl: HTMLElement) {
        const msgId = uuidv4();
        const payload = JSON.stringify({
            header: {
                msg_id: msgId,
                username: "",
                session: this.cellSessionId,
                msg_type: 'execute_request',
            },
            metadata: {},
            content: {
                code: code,
                silent: false,
                user_variables: [],
                user_expressions: {
                    "_sagecell_files": "sys._sage_.new_files()",
                },
                allow_stdin: false
            },
            parent_header: {}
        });
        this.outputWriters[msgId] = new OutputWriter(outputEl);
        this.queue.push(payload)
    }

    send() {
        const payload = this.queue.shift();
        if (this.webSocket) {
            this.webSocket.send(`${this.sessionId}/channels,${payload}`);
        } else {
            console.warn("SageMath Integration: Attempted to send data before server connection was established.")
        }
    }

    async handleReply(msg: MessageEvent) {
        console.log("Raw Message:", msg.data);
        console.log("Header:", msg.data.substring(0, 46)); 
        console.log("Payload:", msg.data.substring(46));

        const data = JSON.parse(msg.data.substring(46)); // TODO: Fix magic number
        const msgType = data.header.msg_type;
        const msgId = data.parent_header.msg_id;
        const content = data.content;

        // TODO: Check returned data if types here still valid
        if (msgType == 'stream' && content.text) {
            this.outputWriters[msgId].appendText(content.text);
        }
        if (msgType == 'display_data' && content.data['text/image-filename']) {
            this.outputWriters[msgId].appendImage(this.getFileUrl(content.data['text/image-filename']));
        }
        if (msgType == 'display_data' && content.data['text/html']) {
            this.outputWriters[msgId].appendSafeHTML(content.data['text/html']);
        }
        if (msgType == 'error') {
            this.outputWriters[msgId].appendError(content);
        }
        if (msgType == 'execute_reply') {
            if (this.queue.length > 0) {
                this.send();
            } else {
                this.disconnect();
            }
        }
    }

    disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.webSocket) this.webSocket.close();
            this.connected = false;
            this.sessionId = null;
            this.cellSessionId = null;
            this.outputWriters = {};
            this.webSocket = null;
            resolve();
        });
    }

    cleanServerUrl(serverUrl: string): string {
        return serverUrl.replace(/\/$/, ""); 
    }
    
    getKernelUrl(): string {
        return `${this.serverUrl}/kernel?CellSessionID=${this.cellSessionId}&timeout=inf&accepted_tos=true`
    }

    getWebSocketUrl(): string {
        return `${this.serverUrl}/sockjs?CellSessionID=${this.cellSessionId}`
    }

    getFileUrl(file: string): string {
        return `${this.serverUrl}/kernel/${this.sessionId}/files/${file}`
    }
}