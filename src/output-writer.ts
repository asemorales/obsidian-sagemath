export default class OutputWriter {
    outputEl: HTMLElement
    lastType: string | null

    constructor(target: HTMLElement) {
        this.outputEl = target;
        this.lastType = null;
    }

    appendText(text: string) {
        if (this.lastType == 'text') {
            const previousPreEl = this.outputEl.querySelectorAll('pre');

            if (previousPreEl && previousPreEl.length > 0) {
                const lastPre = previousPreEl[previousPreEl.length - 1] as HTMLPreElement;
                lastPre.innerText += text;
            }


        } else {
            const preEl = document.createElement("pre");
            preEl.innerText = text;
            this.outputEl.appendChild(preEl);
        }
        this.lastType = 'text';
    }

    appendImage(url: string) {
        const imgEl = document.createElement("img");
        imgEl.src = url;
        imgEl.classList.add('sagecell-image');

        this.outputEl.appendChild(imgEl);
        this.outputEl.appendChild(document.createTextNode("\n"));
        this.lastType = 'image';
    }

    appendSafeHTML(html: string) {
        const parser = new DOMParser();
        const unsafeDoc = parser.parseFromString(html, 'text/html');

        unsafeDoc.querySelectorAll('script').forEach((scriptEl: HTMLElement) => {
            if (scriptEl instanceof HTMLInputElement && scriptEl.type == 'math/tex') {
                const mathEl = document.createElement('math');
                mathEl.appendChild(document.createTextNode(scriptEl.innerText));
                scriptEl.parentNode?.replaceChild(mathEl, scriptEl);
            }
        });

        const safeHTML = window.DOMPurify.sanitize(unsafeDoc.documentElement.innerHTML);
        const safeDoc = parser.parseFromString(safeHTML, 'text/html');

        safeDoc.querySelectorAll('math').forEach((mathEl: HTMLElement) => {
            const spanEl = document.createElement('span')
            spanEl.classList.add('math', 'math-inline');

            const newEl = window.MathJax.tex2chtml(mathEl.textContent || '', { display: false });
            spanEl.appendChild(newEl);
            mathEl.parentNode?.replaceChild(spanEl, mathEl);
        });

        this.outputEl.innerHTML += safeDoc.body.innerHTML;
        this.lastType = 'html';

        window.MathJax.startup.document.clear();
        window.MathJax.startup.document.updateDocument();
    }

    appendError(error: any) {
        const spanEl = document.createElement("pre");
        spanEl.classList.add('sagecell-error');
        spanEl.innerText = `${error.ename}: ${error.evalue}`;

        this.outputEl.appendChild(spanEl);
        this.lastType = 'error';
    }
}