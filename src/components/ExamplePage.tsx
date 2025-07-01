import * as React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { PageSection, Title, TitleSizes } from '@patternfly/react-core';
import './example.css';

const ExamplePage: React.FC = () => {
  const { t } = useTranslation('plugin__node-dashboard');
  return (
    <>
      <Helmet>
        <title>{t('Hello, Plugin!')}</title>
      </Helmet>
      <PageSection>
        <Title headingLevel="h1" size={TitleSizes['2xl']}>
          {t('Hello, Plugin!')}
        </Title>
        <p>
          <span className="node-dashboard__nice">{t('This is a custom plugin.')}</span>
        </p>
      </PageSection>
    </>
  );
};

export default ExamplePage;
