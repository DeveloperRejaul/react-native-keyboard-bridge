import type {ReactNode} from 'react';
import {useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import {BoltIcon, DevicesIcon, GithubIcon, ArrowRightIcon} from '@site/src/components/Icons';

import styles from './index.module.css';

const EXAMPLE = `import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

export default function KeyboardApp() {
  const [shifted, setShifted] = useState(false);

  return (
    <View style={styles.row}>
      {['q', 'w', 'e', 'r', 't', 'y'].map((key) => (
        <TouchableOpacity
          key={key}
          onPress={() => commitText(shifted ? key.toUpperCase() : key)}>
          <Text style={styles.key}>
            {shifted ? key.toUpperCase() : key}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={() => deleteSurroundingText(1, 0)}>
        <Text style={styles.key}>⌫</Text>
      </TouchableOpacity>
    </View>
  );
}`;

const APP_EXAMPLE = `import { useEffect, useState } from 'react';
import { Button, SafeAreaView, Text, TextInput, View } from 'react-native';
import {
  isKeyboardEnabled,
  openInputMethodSettings,
  showInputMethodPicker,
} from 'react-native-keyboard-bridge';

export default function App() {
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    isKeyboardEnabled().then(setEnabled);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text>
        {enabled ? 'Switch to "My Keyboard" below.' : 'Enable "My Keyboard" below.'}
      </Text>
      <View style={{ flexDirection: 'row', marginVertical: 12 }}>
        <Button
          title="Enable keyboard"
          onPress={() => {
            openInputMethodSettings();
            isKeyboardEnabled().then(setEnabled);
          }}
        />
        <Button title="Switch keyboard" onPress={showInputMethodPicker} />
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type here to test your keyboard…"
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
        multiline
      />
    </SafeAreaView>
  );
}`;

const INDEX_EXAMPLE = `import { AppRegistry } from 'react-native';
import App from './App';
import KeyboardApp from './src/keyboard/KeyboardApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);`;

const CODE_TABS = [
  {id: 'keyboard', filename: 'KeyboardApp.tsx', code: EXAMPLE, lang: 'tsx'},
  {id: 'app', filename: 'App.tsx', code: APP_EXAMPLE, lang: 'tsx'},
  {id: 'index', filename: 'index.js', code: INDEX_EXAMPLE, lang: 'js'},
] as const;

const STATS = [
  {value: '2', label: 'Platforms, 1 codebase'},
  {value: '0', label: 'Native UI code to write'},
  {value: '∞', label: 'Languages & scripts'},
  {value: '100%', label: 'Real React Native'},
];

const STEPS = [
  {
    number: '01',
    title: 'Install',
    description: 'One package. JS bridge, native modules, and the iOS setup CLI all ship together.',
    code: `yarn add react-native-keyboard-bridge`,
    lang: 'bash',
  },
  {
    number: '02',
    title: 'Write your keyboard',
    description: 'Register a plain component under the fixed name KeyboardApp.',
    code: `import { AppRegistry } from 'react-native';
import KeyboardApp from './src/keyboard/KeyboardApp';

AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);`,
    lang: 'js',
  },
  {
    number: '03',
    title: 'Wire up iOS',
    description: 'Apple requires a distinct App Extension target — one CLI command scaffolds it.',
    code: `npx react-native-keyboard-bridge setup-ios
npx react-native-keyboard-bridge build-keyboard`,
    lang: 'bash',
  },
  {
    number: '04',
    title: 'Let users enable it',
    description: 'Prompt from your own app screen — neither platform allows a silent switch.',
    code: `import { openInputMethodSettings } from 'react-native-keyboard-bridge';

<Button title="Enable keyboard" onPress={openInputMethodSettings} />`,
    lang: 'tsx',
  },
];

const LANGUAGES = [
  {script: 'বাংলা', sample: "commitText('বাংলা')", label: 'Bangla'},
  {script: 'العربية', sample: "commitText('العربية')", label: 'Arabic (RTL)'},
  {script: 'हिन्दी', sample: "commitText('हिन्दी')", label: 'Devanagari'},
  {script: '中文', sample: "commitText('中文')", label: 'CJK'},
  {script: 'Русский', sample: "commitText('Русский')", label: 'Cyrillic'},
  {script: 'English', sample: "commitText('English')", label: 'Latin'},
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const [activeTab, setActiveTab] = useState<(typeof CODE_TABS)[number]['id']>('keyboard');
  const active = CODE_TABS.find((tab) => tab.id === activeTab) ?? CODE_TABS[0];
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className="container">
        <div className={styles.heroLayout}>
          <div className={styles.heroText}>
            <div className={styles.badges}>
              <span className={styles.badge}>
                <BoltIcon className={styles.badgeIcon} /> Hermes + JSI + Fabric
              </span>
              <span className={styles.badge}>
                <DevicesIcon className={styles.badgeIcon} /> Android &amp; iOS
              </span>
            </div>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <div className={styles.buttons}>
              <Link className={clsx('button button--lg', styles.primaryButton)} to="/docs/">
                Get Started
                <ArrowRightIcon className={styles.buttonIcon} />
              </Link>
              <Link
                className={clsx('button button--lg', styles.ghostButton)}
                to="https://github.com/DeveloperRejaul/react-native-keyboard-bridge">
                <GithubIcon className={styles.buttonIcon} />
                GitHub
              </Link>
            </div>
            <div className={styles.statsRow}>
              {STATS.map((stat) => (
                <div key={stat.label} className={styles.statCard}>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.heroCode}>
            <div className={styles.windowFrame}>
              <div className={styles.windowDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.windowTabs}>
                {CODE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={clsx(styles.windowTab, tab.id === activeTab && styles.windowTabActive)}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.filename}
                  </button>
                ))}
              </div>
              <div className={styles.windowCaption}>
                {active.id === 'keyboard' && 'The keyboard you write'}
                {active.id === 'app' && 'Your app'}
                {active.id === 'index' && 'Registers both, one entry point'}
              </div>
              <div className={styles.codeScrollArea}>
                <CodeBlock language={active.lang} key={active.id} showLineNumbers>
                  {active.code}
                </CodeBlock>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomepageSteps() {
  return (
    <section className={styles.stepsSection}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">Get started in minutes</Heading>
          <p>Four steps, and both platforms are running your keyboard.</p>
        </div>
        <div className={styles.stepsGrid}>
          {STEPS.map((step) => (
            <div key={step.number} className={styles.stepCard}>
              <div className={styles.stepNumber}>{step.number}</div>
              <Heading as="h3">{step.title}</Heading>
              <p>{step.description}</p>
              <CodeBlock language={step.lang} showLineNumbers={step.lang !== 'bash'}>
                {step.code}
              </CodeBlock>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageLanguages() {
  return (
    <section className={styles.languagesSection}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">Works in every language, natively</Heading>
          <p>
            <code>commitText</code> takes a plain Unicode string — no transliteration layer,
            no script whitelist, no special-casing for right-to-left.
          </p>
        </div>
        <div className={styles.languageGrid}>
          {LANGUAGES.map((l) => (
            <div key={l.label} className={styles.languageCard}>
              <div className={styles.languageScript}>{l.script}</div>
              <code className={styles.languageSample}>{l.sample}</code>
              <div className={styles.languageLabel}>{l.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const WHY_IT_MATTERS = [
  {
    title: 'No native UI code to maintain',
    description: 'The Kotlin/Swift side only wires up a runtime and a text-editing bridge — every pixel comes from your JS.',
  },
  {
    title: 'One JS bundle, two hosts',
    description: 'The same registered "KeyboardApp" component is requested by ReactHost on Android and RCTRootViewFactory on iOS.',
  },
  {
    title: 'Autolinked where possible',
    description: 'Android needs zero manual wiring. iOS needs one Xcode App Extension target — Apple requires it, so one CLI command scaffolds it.',
  },
];

function HomepageComparison() {
  return (
    <section className={styles.comparisonSection}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">How it works</Heading>
          <p>The same live surface, hosted the native way each platform expects.</p>
        </div>
        <div className={styles.tableCard}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th></th>
                <th>Android</th>
                <th>iOS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Runtime</td>
                <td>Real React Native (New Architecture, <code>ReactHost</code>)</td>
                <td>Real React Native (New Architecture, <code>RCTReactNativeFactory</code>)</td>
              </tr>
              <tr>
                <td>Your component</td>
                <td>Runs live, unmodified</td>
                <td>Runs live, unmodified</td>
              </tr>
              <tr>
                <td>Rendering</td>
                <td>Fabric, same as any RN screen</td>
                <td>Fabric, same as any RN screen</td>
              </tr>
              <tr>
                <td>Text editing</td>
                <td><code>InputConnection</code></td>
                <td><code>UITextDocumentProxy</code></td>
              </tr>
              <tr>
                <td>Bridge module</td>
                <td><code>KeyboardBridgeModule.kt</code></td>
                <td><code>KeyboardBridgeModule.swift</code></td>
              </tr>
              <tr>
                <td>Native module setup</td>
                <td>Autolinked automatically</td>
                <td>One-time <code>setup-ios</code> CLI command</td>
              </tr>
              <tr>
                <td>Host process</td>
                <td><code>InputMethodService</code></td>
                <td>Custom Keyboard App Extension</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className={styles.whyGrid}>
          {WHY_IT_MATTERS.map((item) => (
            <div key={item.title} className={styles.whyCard}>
              <Heading as="h3">{item.title}</Heading>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageCTA() {
  return (
    <section className={styles.ctaSection}>
      <div className="container">
        <div className={styles.ctaCard}>
          <Heading as="h2">Ready to build your keyboard?</Heading>
          <p>One install. Real React Native. Live on both platforms.</p>
          <div className={styles.ctaButtons}>
            <Link className={clsx('button button--lg', styles.primaryButton)} to="/docs/">
              Read the docs
              <ArrowRightIcon className={styles.buttonIcon} />
            </Link>
            <Link
              className={clsx('button button--lg', styles.ctaGhostButton)}
              to="https://github.com/DeveloperRejaul/react-native-keyboard-bridge">
              <GithubIcon className={styles.buttonIcon} />
              Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Build a mobile system keyboard out of ordinary React Native components — one component, real React Native, live on both Android and iOS.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <HomepageSteps />
        <HomepageLanguages />
        <HomepageComparison />
        <HomepageCTA />
      </main>
    </Layout>
  );
}
