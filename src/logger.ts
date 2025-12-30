const PREFIX = "SageMath Integration: ";

export function log(message: string, ...args: any[]) {
    console.log(PREFIX, message, ...args);
}

export function logError(message: string, ...args: any[]) {
    console.error(PREFIX, message, ...args);
}

export function logWarning(message: string, ...args: any[]) {
    console.warn(PREFIX, message, ...args);
}
