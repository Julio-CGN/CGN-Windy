// Transferred via https://transform.tools/typescript-to-javascript
import fs from 'fs';
import MagicString from 'magic-string';
import { walk } from 'estree-walker';

/**
 * Replaces @windy/, @plugins/ virtual imports in the given AST with the appropriate code modifications.
 *
 * @param ast - The Abstract Syntax Tree (AST) representing the code.
 * @param msCode - The MagicString object representing the code with source maps.
 */
const replaceVirualImports = (ast, msCode) => {
    walk(ast, {
        enter(node) {
            if (node.type === 'ImportDeclaration') {
                const source = node.source.value?.toString() || '';
                const { start, end, specifiers } = node;

                const removeEmptyImpoert = () => {
                    const originalString = msCode.slice(start, end);
                    msCode.overwrite(
                        start,
                        end,
                        `// transformCode (empty import): ${originalString}`,
                    );
                };

                if (source.startsWith('@windy/')) {
                    if (!specifiers || !specifiers.length) {
                        // Empty useless import line like: import '@windy/whatever';
                        removeEmptyImpoert();
                    } else {
                        const originalString = msCode.slice(start, end);
                        const windyModuleId = source.replace('@windy/', '');
                        let newCode = `// transformCode: ${originalString}\n`;

                        const multipleSpecifiers = [];
                        for (const specifier of specifiers) {
                            if (specifier.type === 'ImportSpecifier') {
                                // named imports
                                if (specifier.imported.name === specifier.local.name) {
                                    multipleSpecifiers.push(specifier.local.name);
                                } else {
                                    multipleSpecifiers.push(
                                        `${specifier.imported.name}: ${specifier.local.name}`,
                                    );
                                }
                            } else {
                                // default import, or import to one variable
                                newCode += `const ${specifier.local.name} = W.${windyModuleId};\n`;
                            }
                        }
                        if (multipleSpecifiers.length) {
                            newCode += `const { ${multipleSpecifiers.join(
                                ', ',
                            )} } = W.${windyModuleId};\n`;
                        }
                        msCode.overwrite(start, end, newCode);
                    }
                }
            }
        },
    });
};

/**
 * Replaces the export statements in the given AST with a modified export statement.
 * If no export statements are found, a new export statement is added.
 *
 * @param ast - The Abstract Syntax Tree (AST) of the code.
 * @param msCode - The MagicString instance representing the code.
 * @param addedLiterars - An array of additional literals to be exported.
 */
const replaceExports = (ast, msCode, addedLiterars) => {
    let exportWasReplaced = false;
    walk(ast, {
        enter(node) {
            if (node.type === 'ExportNamedDeclaration') {
                const { start, end, specifiers } = node;
                const specifierLiterals = specifiers?.map(s => {
                    if (s.local.name === s.exported.name) {
                        return s.local.name;
                    } else {
                        return `${s.local.name} as ${s.exported.name}`;
                    }
                });
                const newExports = [...addedLiterars, ...specifierLiterals];
                const newCode = `\n// transformCode: Export statement was modified\nexport { ${newExports.join(
                    ', ',
                )} };\n`;
                msCode.append(newCode);
                msCode.remove(start, end);
                exportWasReplaced = true;
            }
        },
    });

    if (!exportWasReplaced) {
        const newCode = `\n// transformCode: Export statement was added\nexport { ${addedLiterars.join(
            ', ',
        )} };\n`;
        msCode.append(newCode);
    }
};

/**
 * Transforms the code based on the provided parameters.
 *
 * @param code - The code to be transformed.
 * @param sourcemaps - A boolean indicating whether sourcemaps should be generated.
 * @param pluginContext - The plugin context.
 * @returns An object containing the transformed code and optional sourcemaps.
 */
const transformCode = async (code, sourcemaps, pluginContext, path) => {
    const ast = pluginContext.parse(code);
    const msCode = new MagicString(code);

    replaceVirualImports(ast, msCode);

    const configPath = `${path}/pluginConfig.ts`;
    try {
        const configFile = await fs.readFileSync(configPath, 'utf8');

        // https://regex101.com/r/0VX3vT/1
        const getObjectParser = /^[^{]+(?<body>{(?:.*|\n)+})[^}]+$/gm;
        const dirtyBody = getObjectParser.exec(configFile)?.groups?.body;
        const pluginConfig = eval(`(${dirtyBody})`);

        pluginConfig.built = Date.now();
        pluginConfig.builtReadable = new Date().toISOString();

        msCode.prepend(
            `const __pluginConfig =  ${JSON.stringify(pluginConfig, undefined, 2)};\n\n`,
        );
    } catch (e) {
        console.error(`Error while opening and parsing ${configPath}`, e);
        process.exit(1);
    }

    replaceExports(ast, msCode, ['__pluginConfig']);

    return {
        code: msCode.toString(),
        map: sourcemaps ? msCode.generateMap({ hires: true }) : undefined,
    };
};

/**
 * Creates a Rollup plugin that transforms code to ESM format with our enhancements
 * @returns The Rollup plugin.
 */
export function transformCodeToESMPlugin() {
    let shouldGenerateSourcemaps = false;
    return {
        name: 'transform-to-esm-plugin',
        options(options) {
            const outputOptions = Array.isArray(options.output)
                ? options.output[0]
                : options.output ?? {};

            shouldGenerateSourcemaps = Boolean(outputOptions.sourcemap);

            return undefined;
        },
        renderChunk(code, chunk) {
            const { facadeModuleId } = chunk;
            const pathOfTheFile = facadeModuleId.replace(/\/[^/]*$/, '');
            return transformCode(code, shouldGenerateSourcemaps, this, pathOfTheFile);
        },
    };
}
