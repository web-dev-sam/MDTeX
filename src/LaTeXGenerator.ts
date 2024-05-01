import { Node } from "unist";
import { parse as parseYaml } from "yaml";
import {
    AggregatedNode,
    aggregateLiteralValues,
    logInfo,
    traverseAst,
} from "./utils.js";

export enum LaTeXContext {
    BEFORE_PACKAGES,
    PACKAGES,
    AFTER_PACKAGES,
    BODY,
    ANY,
}

export type LaTeXProcessor = {
    handler: (node: AggregatedNode, context: LaTeXContext) => string;
    contexts: LaTeXContext[];
};

export class LaTeXGenerator {
    private processors: Map<LaTeXContext, Array<LaTeXProcessor>>;

    constructor() {
        this.processors = new Map();
    }

    private registerHandler(context: LaTeXContext, processor: LaTeXProcessor) {
        if (!this.processors.has(context)) {
            this.processors.set(context, []);
        }
        this.processors.get(context)?.push(processor);
    }

    registerProcessor(processor: LaTeXProcessor) {
        processor.contexts.forEach((context) =>
            this.registerHandler(context, processor)
        );
    }

    generate(node: Node, context: LaTeXContext): string {
        logInfo([
            `Validating processor plugins for LaTeXContext.${LaTeXContext[context]}.`,
        ]);
        this.validateProcessors(node);

        const anyProcessors = this.processors.get(LaTeXContext.ANY) ?? [];
        const currentContextProcessors = this.processors.get(context) ?? [];
        const contextProcessors = [
            ...anyProcessors,
            ...currentContextProcessors,
        ];

        logInfo([
            `Running processor plugins for LaTeXContext.${LaTeXContext[context]}.`,
        ]);
        aggregateLiteralValues(node, (currentNode) => {
            const currentProcessors = contextProcessors;

            if (currentNode.type === "yaml" && !currentNode.yaml) {
                currentNode.yaml = parseYaml(currentNode.aggregatedValue);
            }

            let result = "";
            currentProcessors.forEach(
                (processor) =>
                    (result += processor.handler(currentNode, context))
            );
            return result;
        });

        const aggregatedNode = node as AggregatedNode;
        return aggregatedNode.aggregatedValue;
    }

    validateProcessors(node: Node) {
        const nodeTypes = new Set<string>();
        traverseAst(node, (currentNode) => {
            nodeTypes.add(currentNode.type);
        });
    }
}
