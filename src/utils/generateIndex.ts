import * as fs from 'fs/promises';
import * as path from 'path';
import { getReading } from '../japanese/tokenizer';
import { normalize } from '../japanese/normalizer';
import { romajiToHiragana } from './index'; // Assuming index.ts exports this
import { NormalizationOptions } from '../types'; // Assuming types/index.ts exports this

interface GenerateIndexOptions {
    inputFile: string;
    outputFile: string;
    key?: string; // For object arrays
    useKanaNormalization?: boolean;
    normalizationOptions?: NormalizationOptions;
    // Add other relevant options if needed (e.g., custom tokenizer path)
}

interface IndexedItem<T> {
    original: T;
    normalized: string;
    reading: string;
}

// Helper to extract text (similar to Aimai class, but simplified for script)
function extractText<T>(item: T, key?: string): string {
    if (typeof item === 'string') {
        return item;
    }
    if (key && typeof (item as any)?.[key] === 'string') {
        return (item as any)[key];
    }
    // Basic fallback for objects without a specified key (might need adjustment)
    if (typeof item === 'object' && item !== null) {
        // If it's an object and no key is specified, try joining string values
        // This might need refinement based on expected object structures
        return Object.values(item).filter(v => typeof v === 'string').join(' ');
    }
    return String(item); // Fallback
}


// Helper to normalize text (based on options)
function normalizeTextInternal(text: string, useKanaNormalization: boolean, normOpts: Required<NormalizationOptions>): string {
    let s = text;
    // Romaji conversion is usually done on the *query*, not the index data itself,
    // unless the source data might contain romaji that needs pre-conversion.
    // Assuming source is primarily Japanese for now.
    // s = romajiToHiragana(s); // Consider if needed for your source data

    if (useKanaNormalization) {
        s = normalize(s, normOpts);
    } else {
        s = s.toLowerCase(); // Basic lowercase if normalization is off
    }
    return s;
}


async function generateIndex<T>(options: GenerateIndexOptions): Promise<void> {
    console.log(`Reading input file: ${options.inputFile}`);
    const inputFilePath = path.resolve(options.inputFile);
    const outputFilePath = path.resolve(options.outputFile);

    const defaultNormOptions: Required<NormalizationOptions> = {
        normalizeLongVowel: true,
        expandIterationMark: true,
        ...(options.normalizationOptions || {}),
    };
    const useKanaNorm = options.useKanaNormalization !== false; // Default true

    try {
        const data = JSON.parse(await fs.readFile(inputFilePath, 'utf-8'));
        if (!Array.isArray(data)) {
            throw new Error('Input file must contain a JSON array.');
        }

        console.log(`Processing ${data.length} items...`);
        const indexedData: IndexedItem<T>[] = [];

        // Process items sequentially to avoid overwhelming kuromoji
        for (const item of data) {
            const rawText = extractText(item, options.key);
            const normalizedText = normalizeTextInternal(rawText, useKanaNorm, defaultNormOptions);
            const reading = await getReading(rawText); // Assuming default tokenizer for generation
            const normalizedReading = normalizeTextInternal(reading, useKanaNorm, defaultNormOptions); // Normalize reading too

            indexedData.push({
                original: item,
                normalized: normalizedText,
                reading: normalizedReading, // Store normalized reading
            });
        }

        console.log(`Writing index to: ${outputFilePath}`);
        await fs.writeFile(outputFilePath, JSON.stringify(indexedData, null, 2));
        console.log('Index generation complete.');

    } catch (error) {
        console.error('Error generating index:', error);
        process.exit(1); // Exit with error code
    }
}

// --- Command Line Argument Parsing (Basic Example) ---
// You might want to use a library like 'yargs' for more robust CLI handling
async function main() {
    const args = process.argv.slice(2);
    const inputFileArg = args.find(arg => arg.startsWith('--input='));
    const outputFileArg = args.find(arg => arg.startsWith('--output='));
    const keyArg = args.find(arg => arg.startsWith('--key='));
    const kanaNormArg = args.find(arg => arg.startsWith('--useKanaNormalization='));

    if (!inputFileArg || !outputFileArg) {
        console.error('Usage: node <script_path> --input=<input.json> --output=<output.json> [--key=<object_key>] [--useKanaNormalization=true|false]');
        process.exit(1);
    }

    const options: GenerateIndexOptions = {
        inputFile: inputFileArg.split('=')[1],
        outputFile: outputFileArg.split('=')[1],
        key: keyArg ? keyArg.split('=')[1] : undefined,
        useKanaNormalization: kanaNormArg ? kanaNormArg.split('=')[1].toLowerCase() === 'true' : undefined, // Parse boolean
        // Add parsing for other options like normalizationOptions if needed
    };

    // Ensure kuromoji dictionary is available (adjust path if necessary)
    // This might require setting KUROMOJI_DIC_PATH environment variable
    // or ensuring node_modules/kuromoji/dict exists relative to execution path.
    // For simplicity, we assume kuromoji finds its dictionary.

    await generateIndex(options);
}

// Execute main function if script is run directly
if (require.main === module) {
    main();
}

// Export for potential programmatic use (optional)
// export { generateIndex, GenerateIndexOptions, IndexedItem };
