import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';

import Icon from '@mdi/react';
import {mdiSunglasses} from '@mdi/js';

import { Filter, ToggleFilter } from '../../../components/filter';
import SmallItemTable from '../../../components/small-item-table';

function Glasses() {
    const { t } = useTranslation();
    const [showAllItemSources, setShowAllItemSources] = useState(false);

    return [
        <Helmet key={'glasses-table'}>
            <meta charSet="utf-8" />
            <title>{t('Escape from Tarkov')} - {t('Glasses')}</title>
            <meta
                name="description"
                content="All glasses in Escape from Tarkov sortable by price, armor class etc"
            />
        </Helmet>,
        <div className="display-wrapper" key={'display-wrapper'}>
            <div className="page-headline-wrapper">
                <h1>
                    {t('Escape from Tarkov')} 
                    <Icon path={mdiSunglasses} size={1.5} className="icon-with-text" /> 
                    {t('Glasses')}
                </h1>
                <Filter center>
                    <ToggleFilter
                        checked={showAllItemSources}
                        label={t('Ignore settings')}
                        onChange={(e) =>
                            setShowAllItemSources(!showAllItemSources)
                        }
                        tooltipContent={
                            <>
                                {t('Shows all sources of items regardless of your settings')}
                            </>
                        }
                    />
                </Filter>
            </div>

            <SmallItemTable
                typeFilter={'glasses'}
                showAllSources={showAllItemSources}
                armorClass={1}
                blindnessProtection={2}
                stats={3}
                cheapestPrice={4}
            />

            <div className="page-wrapper items-page-wrapper">
                <p>
                    {"Eyewear in Escape from Tarkov can be used to decrease the number and quantity of raindrops on the players' screens as well as the length of flashbang effects."}
                </p>
            </div>
        </div>,
    ];
}

export default Glasses;
