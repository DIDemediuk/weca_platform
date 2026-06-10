import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SEED_INTELLIGENCES } from "../src/domain/intelligences.seed.js";
import { INTELLIGENCE_TYPES, type IntelligenceType, type Report } from "../src/domain/types.js";
import { imageFileToDataUri } from "../src/services/imageSrc.js";
import { closeBrowser, renderPdf } from "../src/services/pdf.js";
import { renderRadarSvg } from "../src/services/radar.js";
import { renderReportHtml } from "../src/services/reportTemplate.js";

interface CliOptions {
  outputPath: string;
  childName: string;
  shift: string;
  primaryType: IntelligenceType;
  secondaryType?: IntelligenceType;
  example: string;
  photoPath?: string;
  createdAt: string;
}

const DEFAULT_EXAMPLE =
  "This preview paragraph is intentionally long enough to test the cover page spacing, quote card height, and the way the report breathes across the first page.";

function usage(): string {
  return `Usage:
  npm run pdf:preview -- [output.pdf] [options]

Options:
  --out <path>          PDF output path (default: tmp/report-preview.pdf)
  --child <name>        Child name shown on the cover (default: Preview Kid)
  --shift <name>        Shift name/number (default: 3 Kids)
  --primary <type>      Main intelligence type (default: musical)
  --secondary <type>    Secondary intelligence type (default: intrapersonal)
  --example <text>      Example paragraph for the quote block
  --photo <path>        Local image to embed; uses a generated placeholder when omitted
  --date <iso-date>     Report date (default: now)
  --help                Show this help

Types: ${INTELLIGENCE_TYPES.join(", ")}`;
}

function takeValue(args: string[], index: number, name: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function parseType(value: string, optionName: string): IntelligenceType {
  if (INTELLIGENCE_TYPES.includes(value as IntelligenceType)) {
    return value as IntelligenceType;
  }
  throw new Error(`Invalid ${optionName}: ${value}. Expected one of: ${INTELLIGENCE_TYPES.join(", ")}`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputPath: "tmp/report-preview.pdf",
    childName: "Preview Kid",
    shift: "3 Kids",
    primaryType: "musical",
    secondaryType: "intrapersonal",
    example: DEFAULT_EXAMPLE,
    createdAt: new Date().toISOString(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--out") {
      options.outputPath = takeValue(argv, i, arg);
      i += 1;
    } else if (arg === "--child") {
      options.childName = takeValue(argv, i, arg);
      i += 1;
    } else if (arg === "--shift") {
      options.shift = takeValue(argv, i, arg);
      i += 1;
    } else if (arg === "--primary") {
      options.primaryType = parseType(takeValue(argv, i, arg), arg);
      i += 1;
    } else if (arg === "--secondary") {
      options.secondaryType = parseType(takeValue(argv, i, arg), arg);
      i += 1;
    } else if (arg === "--example") {
      options.example = takeValue(argv, i, arg);
      i += 1;
    } else if (arg === "--photo") {
      options.photoPath = takeValue(argv, i, arg);
      i += 1;
    } else if (arg === "--date") {
      const value = takeValue(argv, i, arg);
      if (Number.isNaN(new Date(value).getTime())) {
        throw new Error(`Invalid --date: ${value}`);
      }
      options.createdAt = new Date(value).toISOString();
      i += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.outputPath = arg;
    }
  }

  return { ...options, outputPath: resolve(options.outputPath) };
}

const byType = (type: IntelligenceType) => {
  const item = SEED_INTELLIGENCES.find((i) => i.type === type);
  if (!item) throw new Error(`Missing seed content for ${type}`);
  return item;
};

function placeholderPhotoSrc(): string {
  const samplePhotoSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" fill="#e8f1ed"/>
    <rect x="120" y="160" width="660" height="880" rx="80" fill="#ffffff" stroke="#ff7a1a" stroke-width="18"/>
    <circle cx="450" cy="430" r="130" fill="#f0c35a"/>
    <path d="M250 910c52-180 120-270 200-270s148 90 200 270" fill="#2f6b45"/>
    <text x="450" y="1110" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#13294b">Preview</text>
  </svg>`
  ).toString("base64");
  return `data:image/svg+xml;base64,${samplePhotoSvg}`;
}

async function photoSrc(photoPath: string | undefined): Promise<string> {
  if (!photoPath) return placeholderPhotoSrc();
  const resolved = resolve(photoPath);
  await access(resolved);
  return imageFileToDataUri(resolved);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const report: Report = {
    id: "preview",
    childName: options.childName,
    shift: options.shift,
    primaryType: options.primaryType,
    secondaryType: options.secondaryType,
    example: options.example,
    photoPath: await photoSrc(options.photoPath),
    createdAt: options.createdAt,
    wovenExample: options.example,
    talentBridge: `«${options.example.trim()}» — саме в таких моментах дитина розкривається найяскравіше.`,
  };

  const html = renderReportHtml({
    report,
    primary: byType(options.primaryType),
    secondary: options.secondaryType ? byType(options.secondaryType) : undefined,
    radarSvg: renderRadarSvg([options.primaryType, options.secondaryType].filter(Boolean) as IntelligenceType[]),
  });

  const pdf = await renderPdf(html);
  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, pdf);
  console.log(`PDF preview written to ${options.outputPath}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  console.error(usage());
  process.exitCode = 1;
} finally {
  await closeBrowser();
}
