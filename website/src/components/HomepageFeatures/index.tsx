import type {ReactNode, ComponentType, SVGProps} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import {AtomIcon, LayersIcon, GlobeIcon, SwipeIcon} from '@site/src/components/Icons';
import styles from './styles.module.css';

type FeatureItem = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    Icon: AtomIcon,
    title: 'Real React Native',
    description: (
      <>
        Hermes + JSI + Fabric, hosted live inside the Android IME process and iOS's Custom
        Keyboard Extension. Not a schema interpreter, not a compiled subset — your actual
        component tree, rendered by Fabric.
      </>
    ),
  },
  {
    Icon: LayersIcon,
    title: 'One component, both platforms',
    description: (
      <>
        Write <code>View</code>/<code>Text</code>/<code>TouchableOpacity</code> once. The exact
        same file runs on Android and iOS — no per-platform reimplementation, no native Kotlin or
        Swift UI code to maintain.
      </>
    ),
  },
  {
    Icon: GlobeIcon,
    title: 'Any language, any script',
    description: (
      <>
        <code>commitText</code> takes a plain Unicode string. Bangla, Arabic, Devanagari, CJK, and
        right-to-left layouts are first-class, not an afterthought bolted on for English.
      </>
    ),
  },
  {
    Icon: SwipeIcon,
    title: 'Gestures & prediction, built in',
    description: (
      <>
        Swipe-typing key-path matching and a pluggable word-prediction interface ship in the same
        package — bring your own dictionary or frequency model.
      </>
    ),
  },
];

function Feature({Icon, title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--3', styles.featureCol)}>
      <div className={styles.featureCard}>
        <div className={styles.featureIconWrap}>
          <Icon className={styles.featureIcon} aria-hidden="true" />
        </div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
