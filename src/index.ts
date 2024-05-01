import fs from "fs";
import {
    astParser,
    logCritical,
    logError,
    logInfo,
    logSuccess,
    logWarn,
} from "./utils.js";
import { LaTeXGenerator } from "./LaTeXGenerator.js";
import { exec } from "child_process";
import { Node } from "unified/lib/index.js";
import { LaTeXContext } from "./LaTeXGenerator.js";

const docCWD = (p: string) => process.cwd() + "/doc" + p;
const srcCWD = (p: string) => process.cwd() + "/src" + p;
const compiledMeta = {
    author: "Max Mustermann",
    title: "Meine tolle Bachelorarbeit",
    tutor: "Prof. Dr. Müller",
    course: "Informatik",
    matrikel: "123456",
    study: "Bachelor",
    type: "Bachelorarbeit",
    degree: "Bachelor of Science",
    template: "",
    acronyms: "",
};

const latexGenerator = new LaTeXGenerator();
latexGenerator.registerProcessor({
    contexts: [LaTeXContext.BODY],
    handler: (node, context) => {
        switch (node.type) {
            case "root":
                return node.aggregatedValue;
            case "yaml":
                if (node.yaml.acronyms) {
                    compiledMeta["acronyms"] = Object.entries(
                        node.yaml.acronyms
                    )
                        .map(([key, value]) => {
                            return `\\acro{${key}}[${key}]{${value}}`;
                        })
                        .join("\n");
                }
                if (node.yaml.template) {
                    compiledMeta["template"] = node.yaml.template;
                }
                const attributes = [
                    "author",
                    "title",
                    "tutor",
                    "course",
                    "matrikel",
                    "study",
                    "type",
                    "degree",
                ];
                attributes.forEach((attr) => {
                    if (node.yaml[attr]) {
                        compiledMeta[attr] = node.yaml[attr];
                    }
                });
                return "";
            case "heading":
                return (
                    {
                        1: `\n\n\\section{${node.aggregatedValue}}\n`,
                        2: `\n\n\\subsection{${node.aggregatedValue}}\n`,
                        3: `\n\n\\subsubsection{${node.aggregatedValue}}\n`,
                    }[node.depth] ?? ""
                );
            case "paragraph":
                const result = node.aggregatedValue
                    .replace(/#\((\w+)\)/g, "\\acf{$1}")
                    .replace(/([A-Za-z])\((.*)\)/g, "$1\\footnote{$2}");
                return `${result}\n`;
            case "text":
                return node.aggregatedValue;
            case "inlineCode":
                return `\\texttt{${node.aggregatedValue}}`;
            case "strong":
                return `\\textbf{${node.aggregatedValue}}`;
            case "emphasis":
                return `\\textit{${node.aggregatedValue}}`;
            case "link":
                if (node.title != null) {
                    return `\\href{${node.url}}{${node.title}}`;
                }
                return `\\url{${node.url}}`;
            case "image":
                return `\n\n\\begin{figure}[H]\n\\centering\n\\includegraphics[width=0.5\\textwidth]{${node.url}}\n\\caption{${node.alt}}\n\\end{figure}\n\n`;
            case "html":
                return "";
            default:
                logWarn([`Unhandled node type: ${node.type}`]);
                break;
        }
        return node.aggregatedValue;
    },
});

// Generate LaTeX
const markdownString = fs.readFileSync(docCWD("/main.md"), "utf8");
const inputAST = (await astParser(markdownString)) as Node;
const documentBody = latexGenerator.generate(inputAST, LaTeXContext.BODY);
const templateExists =
    compiledMeta.template &&
    fs.existsSync(docCWD(`/templates/${compiledMeta.template}`));
if (!templateExists) {
    logCritical([
        'No template specified in YAML frontmatter. Use something like "template: bachelor.tex" and put the bachelor.tex file in the templates/ folder.',
    ]);
}

const templateString = fs.readFileSync(
    docCWD(`/templates/${compiledMeta.template}`),
    "utf8"
);
const outputLaTeX = templateString
    .replace(/{{\s*DOCUMENT\s*}}/g, documentBody)
    .replace(/{{\s*ACRONYMS\s*}}/g, compiledMeta.acronyms)
    .replace(/{{\s*AUTHOR\s*}}/g, compiledMeta.author)
    .replace(/{{\s*TITLE\s*}}/g, compiledMeta.title)
    .replace(/{{\s*TUTOR\s*}}/g, compiledMeta.tutor)
    .replace(/{{\s*COURSE\s*}}/g, compiledMeta.course)
    .replace(/{{\s*MATRIKEL\s*}}/g, compiledMeta.matrikel)
    .replace(/{{\s*STUDY\s*}}/g, compiledMeta.study)
    .replace(/{{\s*TYPE\s*}}/g, compiledMeta.type)
    .replace(/{{\s*DEGREE\s*}}/g, compiledMeta.degree);

const outputFolder = process.cwd() + "/build";
logSuccess([`Compiled to ${outputFolder}/generated.tex`]);
fs.writeFileSync(outputFolder + "/generated.tex", outputLaTeX);

// Generate PDF
const command = `npm run latex`;
logInfo(["Running command"], [command]);
exec(command, (error, stdout, stderr) => {
    if (error) {
        const errorMessage = error.toString();
        const suggestion = errorMessage.includes(
            "'texliveonfly' is not recognized"
        )
            ? "Install texliveonfly using tlmgr or use our Docker image to run LaTeX."
            : "";
        logError(
            [
                `Error while generating PDF.\n${errorMessage}\nERR: ${stderr}\nOUT: ${stdout}`,
            ],
            [suggestion]
        );

        if (stdout.includes("Output written on")) {
            logSuccess(["PDF generated successfully."]);
        }
        return;
    }
    logSuccess(["PDF generated successfully."]);
});
