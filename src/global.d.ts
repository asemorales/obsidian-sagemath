import DOMPurify from 'dompurify';
import * as Prism from 'prismjs';

declare global {
    // Declare libraries globally loaded by Obsidian
    interface Window {
        DOMPurify: typeof DOMPurify;
        Prism: typeof Prism;
        MathJax: { // Temporary fix since @types/mathjax is for MathJax v2. Obsidian uses MathJax v3.
            tex2chtml: (tex: string, options?: MathJaxOptions) => HTMLElement;
            startup: {
                document: {
                    clear: () => void;
                    updateDocument: () => void;
                };
            };
        };
    }

    interface MathJaxOptions {
        display?: boolean;
        em?: number;
        ex?: number;
        containerWidth?: number;
    }
}