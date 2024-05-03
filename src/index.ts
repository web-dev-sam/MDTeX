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
import { spawn } from "child_process";
import { Node } from "unified/lib/index.js";
import { LaTeXContext } from "./LaTeXGenerator.js";
import { NodeHandler, YAMLNodeHandler } from "./extentions/markdown.js";

const docCWD = (p: string) => process.cwd() + "/doc" + p;
const compiledYAMLMeta: Record<string, any> = {};

const latexGenerator = new LaTeXGenerator();
latexGenerator.registerProcessor({
    contexts: [LaTeXContext.BODY],
    handler: (node, context) => {
        switch (node.type) {
            case "root":
                return node.aggregatedValue;
            case "yaml":
                const keys = Object.keys(node.yaml);
                const registeredKeys = Object.keys(YAMLNodeHandler);

                for (const key of keys) {
                    if (registeredKeys.includes(key)) {
                        compiledYAMLMeta[key] = YAMLNodeHandler[key](
                            node.yaml[key],
                            node
                        );
                    } else {
                        compiledYAMLMeta[key] = node.yaml[key];
                    }
                }

                return "";
            default:
                if (NodeHandler[node.type]) {
                    return NodeHandler[node.type](node);
                }
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
    compiledYAMLMeta.template &&
    fs.existsSync(docCWD(`/templates/${compiledYAMLMeta.template}`));
if (!templateExists) {
    logCritical([
        'No template specified in YAML frontmatter. Use something like "template: bachelor.tex" and put the bachelor.tex file in the templates/ folder.',
    ]);
}

const templateString = fs.readFileSync(
    docCWD(`/templates/${compiledYAMLMeta.template}`),
    "utf8"
);

let outputLaTeX = templateString.replace(/{{\s*DOCUMENT\s*}}/g, documentBody);
for (const key in compiledYAMLMeta) {
    outputLaTeX = outputLaTeX.replace(
        new RegExp(`{{\\s*${key.toUpperCase()}\\s*}}`, "g"),
        compiledYAMLMeta[key]
    );
}

const outputFolder = process.cwd() + "/build";
fs.writeFileSync(outputFolder + "/generated.tex", outputLaTeX);
logSuccess([`Compiled to ${outputFolder}/generated.tex`]);

// Generate PDF
if (!process.argv.includes("--no-pdf")) {
    const command = "npm";
    const args = ["run", "latex"];

    logInfo(["Running command"], [`${command} ${args.join(" ")}`]);

    const npmProcess = spawn(command, args, {
        shell: true,
    });

    npmProcess.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
        if (data.toString().includes("Output written on")) {
            logSuccess(["PDF generated successfully."]);
        }
    });

    npmProcess.stderr.on("data", (data) => {
        logError([`STDError: ${data}`]);
    });

    npmProcess.on("error", (error) => {
        logError([`Error: ${error}`]);
    });
}
