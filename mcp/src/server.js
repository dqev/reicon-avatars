import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { generateAvatar, PALETTES, escapeXml } from '../../worker/src/avatar.js';

export const API_BASE = 'https://avatars.reicon.dev';
export const SHAPES = ['circle', 'squircle', 'square'];

const seedSchema = z
  .string()
  .min(1)
  .max(512)
  .default('avatar')
  .describe('Any deterministic seed: name, email, user ID, etc.');

const shapeSchema = z
  .enum(SHAPES)
  .default('square')
  .describe('Outer clipping mask.');

const sizeSchema = z
  .number()
  .int()
  .min(16)
  .max(2048)
  .default(500)
  .describe('Rendered width/height in pixels.');

function buildUrl(seed, shape, size) {
  return `${API_BASE}/v1/svg/${encodeURIComponent(seed)}?shape=${shape}&size=${size}`;
}

function buildSnippet(seed, shape, size) {
  const url = buildUrl(seed, shape, size);
  return `<img src="${escapeXml(url)}" alt="Avatar for ${escapeXml(seed)}" width="${size}" height="${size}" />`;
}

export function createAvatarServer() {
  const server = new McpServer({
    name: 'reicon-avatars',
    version: '1.0.0'
  });

  server.registerTool(
    'generate_avatar',
    {
      title: 'Generate avatar',
      description:
        'Generate a deterministic SVG avatar locally from a seed. Returns the SVG markup, a hosted URL, and embed snippets.',
      inputSchema: {
        seed: seedSchema,
        shape: shapeSchema,
        size: sizeSchema
      },
      outputSchema: {
        seed: z.string(),
        shape: z.enum(SHAPES),
        size: z.number(),
        url: z.string(),
        html: z.string(),
        markdown: z.string(),
        svg: z.string()
      }
    },
    async ({ seed, shape, size }) => {
      const svg = generateAvatar(seed, shape, size);
      const url = buildUrl(seed, shape, size);
      const html = buildSnippet(seed, shape, size);
      const markdown = `![Avatar](${url})`;

      const structuredContent = { seed, shape, size, url, html, markdown, svg };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredContent, null, 2)
          }
        ],
        structuredContent
      };
    }
  );

  server.registerTool(
    'get_avatar_url',
    {
      title: 'Get avatar URL',
      description: 'Build a hosted Reicon avatar URL and embed snippets without generating SVG locally.',
      inputSchema: {
        seed: seedSchema,
        shape: shapeSchema,
        size: sizeSchema
      },
      outputSchema: {
        seed: z.string(),
        shape: z.enum(SHAPES),
        size: z.number(),
        url: z.string(),
        html: z.string(),
        markdown: z.string()
      }
    },
    async ({ seed, shape, size }) => {
      const structuredContent = {
        seed,
        shape,
        size,
        url: buildUrl(seed, shape, size),
        html: buildSnippet(seed, shape, size),
        markdown: `![Avatar](${buildUrl(seed, shape, size)})`
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredContent, null, 2)
          }
        ],
        structuredContent
      };
    }
  );

  server.registerTool(
    'list_avatar_options',
    {
      title: 'List avatar options',
      description: 'List supported shapes, palette names, and the size range accepted by the avatar API.',
      outputSchema: {
        shapes: z.array(z.string()),
        palettes: z.array(z.string()),
        paletteCount: z.number(),
        size: z.object({
          min: z.number(),
          max: z.number(),
          default: z.number()
        })
      }
    },
    async () => {
      const structuredContent = {
        shapes: SHAPES,
        palettes: PALETTES.map((palette) => palette.name),
        paletteCount: PALETTES.length,
        size: { min: 16, max: 2048, default: 500 }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredContent, null, 2)
          }
        ],
        structuredContent
      };
    }
  );

  return server;
}
