/* @flow */
import config from 'config';
import * as React from 'react';
import invariant from 'invariant';
import { withCookies, Cookies } from 'react-cookie';

import log from 'core/logger';
import { getDisplayName } from 'core/utils';

export type WithExperimentInjectedProps = {|
  experimentEnabled: boolean,
  variant: string | null,
|};

type CookieConfig = {|
  path?: string,
|};

type withExperimentProps = {|
  cookieConfig?: CookieConfig,
  id: string,
  variantA: string,
  variantB: string,
|};

type withExperimentInternalProps = {|
  ...withExperimentProps,
  WrappedComponent: React.ComponentType<any>,
  _config: typeof config,
  cookies: typeof Cookies,
  randomizer: () => number,
|};

const defaultCookieConfig: CookieConfig = { path: '/' };

export const withExperiment = ({
  cookieConfig = defaultCookieConfig,
  id: defaultId,
  variantA: defaultVariantA,
  variantB: defaultVariantB,
}: withExperimentProps) => (WrappedComponent: React.ComponentType<any>) => {
  invariant(defaultId, 'id is required');
  invariant(defaultVariantA, 'variantA is required');
  invariant(defaultVariantB, 'variantB is required');

  class WithExperiment extends React.Component<withExperimentInternalProps> {
    experimentCookie: string | void;

    static defaultProps = {
      _config: config,
      id: defaultId,
      randomizer: Math.random,
      variantA: defaultVariantA,
      variantB: defaultVariantB,
    };

    static displayName = `WithExperiment(${getDisplayName(WrappedComponent)})`;

    constructor(props: withExperimentInternalProps) {
      super(props);

      log.info('[WithExperiment.constructor] props:', {
        variantA: props.variantA,
        variantB: props.variantB,
      });

      log.info('[WithExperiment.constructor] this.props:', {
        variantA: this.props.variantA,
        variantB: this.props.variantB,
      });

      if (!this.isExperimentEnabled()) {
        log.debug(`Experiment "${props.id}" is not enabled by config.`);
        return;
      }

      const { cookies, randomizer, variantA, variantB } = this.props;

      this.experimentCookie = cookies.get(this.getCookieName());

      log.info(
        '[WithExperiment.constructor] cookie name:',
        this.getCookieName(),
      );

      log.info(
        '[WithExperiment.constructor] experiment cookie loaded:',
        this.experimentCookie,
      );

      if (this.experimentCookie === undefined) {
        this.experimentCookie = randomizer() >= 0.5 ? variantA : variantB;
        cookies.set(this.getCookieName(), this.experimentCookie, cookieConfig);

        log.info(
          '[WithExperiment.constructor] experiment cookie saved:',
          this.experimentCookie,
        );
      }
    }

    getCookieName() {
      return `${this.props.id}Experiment`;
    }

    isExperimentEnabled() {
      const { _config, id } = this.props;

      return _config.get('experiments')[id] === true;
    }

    render() {
      const {
        cookies,
        id,
        randomizer,
        variantA,
        variantB,
        ...props
      } = this.props;

      const isExperimentEnabled = this.isExperimentEnabled();

      const exposedProps: WithExperimentInjectedProps = {
        experimentEnabled: isExperimentEnabled,
        variant: isExperimentEnabled ? cookies.get(this.getCookieName()) : null,
      };

      log.info('[WithExperiment.render] exposed props:', exposedProps);

      return <WrappedComponent {...exposedProps} {...props} />;
    }
  }

  return withCookies(WithExperiment);
};
