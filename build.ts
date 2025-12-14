import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const isWatch = process.argv.includes('--watch');

const baseConfig: esbuild.BuildOptions = {
  logLevel: 'info',
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  bundle: true,
  minify: true,
  sourcemap: !isWatch,
};

const configs: esbuild.BuildOptions[] = [
  {
    ...baseConfig,
    entryPoints: ['src/background/background.ts'],
    outfile: 'dist/background.js',
  },
  {
    ...baseConfig,
    entryPoints: ['src/content/content.ts'],
    outfile: 'dist/content.js',
  },
  {
    ...baseConfig,
    entryPoints: ['src/popup/popup.ts'],
    outfile: 'dist/popup.js',
  },
  {
    ...baseConfig,
    entryPoints: ['src/options/options.ts'],
    outfile: 'dist/options.js',
  },
];

async function build() {
  try {
    // Ensure dist directory exists
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist', { recursive: true });
    }

    // Copy manifest.json to dist
    fs.copyFileSync('manifest.json', 'dist/manifest.json');
    console.log('✓ Copied manifest.json to dist/');

    // Copy popup.html to dist
    fs.copyFileSync('src/popup/popup.html', 'dist/popup.html');
    console.log('✓ Copied popup.html to dist/');

    // Copy options files to dist
    if (fs.existsSync('src/options/options.html')) {
      fs.copyFileSync('src/options/options.html', 'dist/options.html');
      console.log('✓ Copied options.html to dist/');
    }
    if (fs.existsSync('src/options/options.css')) {
      fs.copyFileSync('src/options/options.css', 'dist/options.css');
      console.log('✓ Copied options.css to dist/');
    }


    // Build all scripts
    for (const config of configs) {
      if (isWatch) {
        const ctx = await esbuild.context(config);
        await ctx.watch();
        console.log(`✓ Watching ${config.entryPoints}`);
      } else {
        await esbuild.build(config);
        console.log(`✓ Built ${config.outfile}`);
      }
    }

    if (!isWatch) {
      console.log('\n✓ Build complete! Extension ready in dist/');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
