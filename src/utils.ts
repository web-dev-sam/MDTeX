import { parse } from "yaml";
import { Node, Literal, Parent } from "unist";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";

export type AggregatedNode = Node & {
    aggregatedValue: string;
    value?: string;
    children?: AggregatedNode[];
    [key: string]: any;
};

export function logWarn(normalMessages: string[], yellowMessages?: string[]) {
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";
    const yellow = "\x1b[33m";
    const warnLabel = "\x1b[43m\x1b[30m WARN \x1b[0m";

    console.warn(
        warnLabel,
        normalMessages.map((msg) => bold + msg + reset).join("\n"),
        (yellowMessages ?? []).map((msg) => yellow + msg + reset).join("\n")
    );
}

export function logError(normalMessages: string[], redMessages?: string[]) {
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";
    const red = "\x1b[31m";
    const errorLabel = "\x1b[41m\x1b[30m ERROR \x1b[0m";

    console.error(
        errorLabel,
        normalMessages.map((msg) => bold + msg + reset).join("\n"),
        (redMessages ?? []).map((msg) => red + msg + reset).join("\n")
    );
}

export function logInfo(normalMessages: string[], blueMessages?: string[]) {
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";
    const blue = "\x1b[34m";
    const infoLabel = "\x1b[44m\x1b[30m INFO \x1b[0m";

    console.info(
        infoLabel,
        normalMessages.map((msg) => bold + msg + reset).join("\n"),
        (blueMessages ?? []).map((msg) => blue + msg + reset).join("\n")
    );
}

export function logCritical(normalMessages: string[], redMessages?: string[]) {
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";
    const purple = "\x1b[35m";
    const criticalLabel = "\x1b[45m\x1b[30m CRITICAL \x1b[0m";

    console.error(
        criticalLabel,
        normalMessages.map((msg) => bold + msg + reset).join("\n"),
        (redMessages ?? []).map((msg) => purple + msg + reset).join("\n")
    );

    process.exit(1);
}

export function logSuccess(normalMessages: string[], greenMessages?: string[]) {
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";
    const green = "\x1b[32m";
    const successLabel = "\x1b[42m\x1b[30m SUCCESS \x1b[0m";

    console.info(
        successLabel,
        normalMessages.map((msg) => bold + msg + reset).join("\n"),
        (greenMessages ?? []).map((msg) => green + msg + reset).join("\n")
    );
}

export function aggregateLiteralValues(
    ast: Node,
    callback: (node: AggregatedNode) => string
) {
    const aggregate = (node: AggregatedNode): string => {
        if (node.value) {
            node.aggregatedValue = node.value;
            node.aggregatedValue = callback(node);
            return node.aggregatedValue;
        }

        if (node.children) {
            node.aggregatedValue = node.children
                .map((child) => aggregate(child))
                .join("");
            node.aggregatedValue = callback(node);
            return node.aggregatedValue;
        }

        return (node.aggregatedValue = callback(node));
    };

    aggregate(ast as AggregatedNode);
}

export function traverseAst<N extends Node>(
    ast: N,
    callback: (node: N, parent: N) => void
) {
    const traverse = (node, parent) => {
        callback(node, parent);
        if (node.children) {
            node.children.forEach((child) => traverse(child, node));
        }
    };
    traverse(ast, null);
}

export const parseYaml = parse;

export async function astParser(doc: string) {
    try {
        const {
            result: { tree, file },
        }: any = await unified()
            .use(remarkParse)
            .use(remarkFrontmatter, ["yaml"])
            .use(remarkGfm)
            .use(function (this: any) {
                this.compiler = compiler;

                function compiler(tree: any, file: any) {
                    return {
                        tree,
                        file,
                    };
                }
            })
            .process(doc.trim());
        return tree;
    } catch (error) {
        throw error;
    }
}
