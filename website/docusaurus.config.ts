import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'react-native-keyboard-bridge',
  tagline: 'Build a mobile system keyboard with ordinary React Native components — one component, real React Native, live on Android and iOS.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  // Published to a separate GitHub account's <org>.github.io repo, so the
  // site is served at the domain root, not under a project sub-path.
  url: 'https://keyboardbridge.github.io',
  baseUrl: '/',

  organizationName: 'keyboardbridge',
  projectName: 'Keyboardbridge.github.io',
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/DeveloperRejaul/react-native-keyboard-bridge/tree/main/website/',
          routeBasePath: 'docs',
        },
        blog: {
          showReadingTime: true,
          blogSidebarTitle: 'All posts',
          blogSidebarCount: 'ALL',
          editUrl: 'https://github.com/DeveloperRejaul/react-native-keyboard-bridge/tree/main/website/',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexBlog: true,
        indexPages: true,
        docsRouteBasePath: '/docs',
        blogRouteBasePath: '/blog',
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    metadata: [
      {
        name: 'keywords',
        content:
          'react native keyboard, custom keyboard react native, android ime react native, ios custom keyboard extension react native, build keyboard app react native, react native input method editor',
      },
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'react-native-keyboard-bridge',
      logo: {
        alt: 'react-native-keyboard-bridge logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://www.npmjs.com/package/react-native-keyboard-bridge',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/DeveloperRejaul/react-native-keyboard-bridge',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Introduction', to: '/docs/'},
            {label: 'Installation', to: '/docs/installation'},
            {label: 'API Reference', to: '/docs/api/overview'},
            {label: 'Blog', to: '/blog'},
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/DeveloperRejaul/react-native-keyboard-bridge/issues',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/DeveloperRejaul/react-native-keyboard-bridge/discussions',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'npm package',
              href: 'https://www.npmjs.com/package/react-native-keyboard-bridge',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/DeveloperRejaul/react-native-keyboard-bridge',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} react-native-keyboard-bridge. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
