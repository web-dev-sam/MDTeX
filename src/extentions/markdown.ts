import { AggregatedNode, logWarn } from "../utils.js";

const referenceRegex = `\\(([^\\s\\)]+)\\)`;
const refArrowRegex = `->`;

const paragraphHandlers: {
    regex: RegExp;
    handler: (node: AggregatedNode) => string;
}[] = [
    {
        regex: new RegExp(`${refArrowRegex}${referenceRegex}`, "g"),
        handler: () => `\\ref{fig:$1}`,
    },
    {
        regex: new RegExp(`${refArrowRegex}#${referenceRegex}`, "g"),
        handler: () => `\\ref{sec:$1}`,
    },
    {
        regex: new RegExp(`#${referenceRegex}`, "g"),
        handler: () => `\\ac{$1}`,
    },
    {
        regex: new RegExp(`#full${referenceRegex}`, "g"),
        handler: () => `\\acf{$1}`,
    },
    {
        regex: new RegExp(`#long${referenceRegex}`, "g"),
        handler: () => `\\acl{$1}`,
    },
    {
        regex: new RegExp(`#short${referenceRegex}`, "g"),
        handler: () => `\\acs{$1}`,
    },
    {
        regex: /(\w)\((.*)\)/g,
        handler: () => `$1\\footnote{$2}`,
    },
];

export const NodeHandler: Record<string, (node: AggregatedNode) => string> = {
    text: (node) => node.aggregatedValue,
    strong: (node) => `\\textbf{${node.aggregatedValue}}`,
    emphasis: (node) => `\\textit{${node.aggregatedValue}}`,
    delete: (node) => `\\sout{${node.aggregatedValue}}`,
    inlineCode: (node) => `\\code{${node.aggregatedValue}}`,
    html: () => "",
    thematicBreak: (node) => "\\newpage\n",
    paragraph: (node) => {
        let result = node.aggregatedValue;
        for (const { regex, handler } of paragraphHandlers) {
            result = result.replace(regex, handler(node));
        }
        return `${result}\n`;
    },
    heading: (node) => {
        const label = node.aggregatedValue.replace(/(.*)->#\(([^\s]+)\)(.*)/g, `\\label{sec:$2}`);
        const heading = node.aggregatedValue.replace(/->#\(([^\s]+)\)/g, "");
        return (
            {
                1: `\n\n\\section{${heading}}${heading === label ? "" : label}\n`,
                2: `\n\n\\subsection{${heading}}${heading === label ? "" : label}\n`,
                3: `\n\n\\subsubsection{${heading}}${heading === label ? "" : label}\n`,
            }[node.depth] ?? ""
        );
    },
    code: (node) =>
        `\\begin{lstlisting}[language=${node.lang}]\n${node.aggregatedValue}\n\\end{lstlisting}\n`,
    link: (node) => {
        const named = !node.aggregatedValue.startsWith("http");
        if (named) {
            return `\\href{${node.url}}{${node.aggregatedValue}}`;
        }
        return `\\url{${node.url}}`;
    },
    image: (node) => {
        return `
            \\begin{figure}[H]\n
            \\centering\n
            \\includegraphics[width=0.5\\textwidth]{doc/assets/${node.url}}\n
            ${node.alt ? `\\caption{${node.alt}}\n` : ""}
            ${node.title ? `\\label{fig:${node.title}}\n` : ""}
            \\end{figure}\n
        `;
    },
    list: (node) => {
        return (
            {
                ordered: `\\begin{enumerate}\n${node.aggregatedValue}\\end{enumerate}\n`,
                unordered: `\\begin{itemize}\n${node.aggregatedValue}\\end{itemize}\n`,
            }[node.ordered ? "ordered" : "unordered"] ?? ""
        );
    },
    listItem: (node) => `\\item ${node.aggregatedValue}\n`,
};

export const YAMLNodeHandler = {
    acronyms: (yaml: any) => {
        return Object.entries(yaml)
            .map(([key, value]) => {
                return `\\acro{${key}}[${key}]{${value}}`;
            })
            .join("\n");
    },
};
