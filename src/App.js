/* eslint-disable no-restricted-globals */
import React, { useEffect, useCallback, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import './App.css';
import i18n from './i18n';
import loadPolyfills from './modules/polyfills';

import Map from './components/Map.jsx';
import RemoteControlId from './components/remote-control-id';
import Menu from './components/menu';
import Footer from './components/footer';
import { fetchTarkovTrackerProgress } from './features/settings/settingsSlice';

import {
    setConnectionStatus,
    enableConnection,
} from './features/sockets/socketsSlice';
import useStateWithLocalStorage from './hooks/useStateWithLocalStorage';
import makeID from './modules/make-id';

import Ammo from './pages/ammo';
import Control from './pages/control';
import LootTiers from './pages/loot-tiers';
import Barters from './pages/barters';
import Maps from './pages/maps/';
import Crafts from './pages/crafts';
import Item from './pages/item';
import Start from './pages/start';
import Settings from './pages/settings';
import Nightbot from './pages/nightbot';
import StreamElements from './pages/stream-elements';
import ApiUsers from './pages/api-users';
import Moobot from './pages/moobot';

import Items from './pages/items/';
import Armor from './pages/items/armor';
import Backpacks from './pages/items/backpacks';
import BarterItems from './pages/items/barter-items';
import Containers from './pages/items/containers';
import Glasses from './pages/items/glasses';
import Grenades from './pages/items/grenades';
import Guns from './pages/items/guns';
import Headsets from './pages/items/headsets';
import Helmets from './pages/items/helmets';
import Keys from './pages/items/keys';
import Mods from './pages/items/mods';
import PistolGrips from './pages/items/pistol-grips';
import Provisions from './pages/items/provisions';
import Rigs from './pages/items/rigs';
import Suppressors from './pages/items/suppressors';
import BsgCategory from './pages/items/bsg-category';
import BitcoinFarmCalculator from './pages/bitcoin-farm-calculator';
import Quests from './pages/quests';
import Quest from './pages/quest';

import Bosses from './pages/bosses';
import Boss from './pages/bosses/boss';

import Trader from './pages/traders/trader';
import Traders from './pages/traders';

import HistoryGraphs from './pages/history-graphs';
import ItemTracker from './pages/item-tracker/';
import Hideout from './pages/hideout';
import WipeLength from './pages/wipe-length';
import About from './pages/about/';

import Guides from './pages/guides';

import ErrorPage from './components/error-page';
import Loading from './components/loading';
import Debug from './components/Debug';

const APIDocs = React.lazy(() => import('./pages/api-docs'));
// import APIDocs from './pages/api-docs';

const socketServer = `wss://socket.tarkov.dev`;

let socket = false;
let tarkovTrackerProgressInterval = false;

loadPolyfills();

function App() {
    const connectToId = new URLSearchParams(window.location.search).get(
        'connection',
    );
    if (connectToId) {
        localStorage.setItem('sessionId', JSON.stringify(connectToId));
    }
    const [sessionID] = useStateWithLocalStorage('sessionId', makeID(4));
    const socketEnabled = useSelector((state) => state.sockets.enabled);
    const controlId = useSelector((state) => state.sockets.controlId);
    let navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    if (connectToId) {
        dispatch(enableConnection());
    }

    const useTarkovTracker = useSelector(
        (state) => state.settings.useTarkovTracker,
    );
    
    const progressStatus = useSelector((state) => {
        return state.settings.progressStatus;
    });

    const tarkovTrackerAPIKey = useSelector(
        (state) => state.settings.tarkovTrackerAPIKey,
    );

    useEffect(() => {
        if (useTarkovTracker && progressStatus !== 'loading' && !tarkovTrackerProgressInterval) {
            dispatch(fetchTarkovTrackerProgress(tarkovTrackerAPIKey));
        }

        if (!tarkovTrackerProgressInterval && useTarkovTracker) {
            tarkovTrackerProgressInterval = setInterval(() => {
                dispatch(fetchTarkovTrackerProgress(tarkovTrackerAPIKey));
            }, 1000 * 60 * 5);
        }

        if (tarkovTrackerProgressInterval && !useTarkovTracker) {
            clearInterval(tarkovTrackerProgressInterval);
            tarkovTrackerProgressInterval = false;
        }

        return () => {
            clearInterval(tarkovTrackerProgressInterval);
        };
    }, [progressStatus, dispatch, tarkovTrackerAPIKey, useTarkovTracker]);

    useEffect(() => {
        const handleDisplayMessage = (rawMessage) => {
            const message = JSON.parse(rawMessage.data);

            if (message.type !== 'command') {
                return false;
            }

            navigate(`/${message.data.type}/${message.data.value}`);
        };

        const connect = function connect() {
            socket = new WebSocket(socketServer);

            const heartbeat = function heartbeat() {
                clearTimeout(socket.pingTimeout);

                // Use `WebSocket#terminate()`, which immediately destroys the connection,
                // instead of `WebSocket#close()`, which waits for the close timer.
                // Delay should be equal to the interval at which your server
                // sends out pings plus a conservative assumption of the latency.
                socket.pingTimeout = setTimeout(() => {
                    if (socket && socket.terminate) {
                        socket.terminate();
                    }
                    dispatch(setConnectionStatus(false));
                }, 40000 + 1000);
            };

            socket.addEventListener('message', (rawMessage) => {
                const message = JSON.parse(rawMessage.data);

                if (message.type === 'ping') {
                    heartbeat();

                    socket.send(JSON.stringify({ type: 'pong' }));

                    return true;
                }

                handleDisplayMessage(rawMessage);
            });

            socket.addEventListener('open', () => {
                console.log('Connected to socket server');
                console.log(socket);

                heartbeat();

                dispatch(setConnectionStatus(true));

                socket.send(
                    JSON.stringify({
                        sessionID: sessionID,
                        type: 'connect',
                    }),
                );
            });

            socket.addEventListener('close', () => {
                console.log('Disconnected from socket server');

                dispatch(setConnectionStatus(false));

                clearTimeout(socket.pingTimeout);
            });

            setInterval(() => {
                if (socket.readyState === 3 && socketEnabled) {
                    console.log('trying to re-connect');
                    connect();
                }
            }, 5000);
        };

        if (socket === false && socketEnabled) {
            connect();
        }

        return () => {
            // socket.terminate();
        };
    }, [socketEnabled, sessionID, navigate, dispatch]);

    const send = useCallback(
        (messageData) => {
            if (socket.readyState !== 1) {
                // Wait a bit if we're not connected
                setTimeout(() => {
                    socket.send(
                        JSON.stringify({
                            sessionID: controlId,
                            ...messageData,
                        }),
                    );
                }, 500);

                return true;
            }

            socket.send(
                JSON.stringify({
                    sessionID: controlId,
                    ...messageData,
                }),
            );
        },
        [controlId],
    );

    const hideRemoteControlId = useSelector(
        (state) => state.settings.hideRemoteControl,
    );
    const remoteControlSessionElement = hideRemoteControlId ? null : (
        <RemoteControlId
            key="connection-wrapper"
            sessionID={sessionID}
            socketEnabled={socketEnabled}
            onClick={(e) => dispatch(enableConnection())}
        />
    );

    return (
        <div className="App">
            <Helmet htmlAttributes={{ lang: i18n.language }}>
                <meta charSet="utf-8" />
                <title>Tarkov.dev</title>
                <meta
                    name="description"
                    content={t(
                        'Checkout all information for items, crafts, barters, maps, loot tiers, hideout profits, spending guides, and more with tarkov.dev! A free, community made, and open source ecosystem of Escape from Tarkov tools and guides.',
                    )}
                />
            </Helmet>
            <Menu />
            {/* <Suspense fallback={<Loading />}> */}
            <Routes>
                <Route
                    path={'/'}
                    element={[
                        <Start key="start-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/ammo'}
                    element={[
                        <div className="display-wrapper" key="ammo-wrapper">
                            <Helmet>
                                <meta charSet="utf-8" />
                                <title>Tarkov Ammo Chart</title>
                                <meta
                                    name="description"
                                    content={t('Visualization of all ammo types in Escape from Tarkov')}
                                />
                            </Helmet>
                            <Ammo />
                        </div>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/ammo/:currentAmmo'}
                    element={[
                        <div className="display-wrapper" key="ammo-wrapper">
                            <Helmet>
                                <meta charSet="utf-8" />
                                <title>Tarkov Ammo Chart</title>
                                <meta
                                    name="description"
                                    content={t('Visualization of all ammo types in Escape from Tarkov')}
                                />
                            </Helmet>
                            <Ammo />
                        </div>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/maps/'}
                    element={[
                        <Maps key="maps-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path="/map/:currentMap"
                    element={[
                        <div className="display-wrapper" key="map-wrapper">
                            <Map />
                        </div>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/barter'}
                    element={[
                        <LootTiers
                            sessionID={sessionID}
                            key="loot-tier-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/loot-tier/:currentLoot'}
                    element={[
                        <LootTiers
                            sessionID={sessionID}
                            key="loot-tier-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/loot-tier'}
                    element={[
                        <LootTiers
                            sessionID={sessionID}
                            key="loot-tier-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/barters/'}
                    element={[
                        <Barters key="barters-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/'}
                    element={[
                        <Items key="items-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path="/items/helmets"
                    element={[
                        <Helmets sessionID={sessionID} key="helmets-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />

                <Route
                    path="/items/glasses"
                    element={[
                        <Glasses sessionID={sessionID} key="glasses-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/armor'}
                    element={[
                        <Armor sessionID={sessionID} key="armor-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/backpacks'}
                    element={[
                        <Backpacks
                            sessionID={sessionID}
                            key="backpacks-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/rigs'}
                    element={[
                        <Rigs sessionID={sessionID} key="rigs-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/suppressors'}
                    element={[
                        <Suppressors
                            sessionID={sessionID}
                            key="suppressors-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/guns'}
                    element={[
                        <Guns sessionID={sessionID} key="guns-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/mods'}
                    element={[
                        <Mods sessionID={sessionID} key="mods-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/pistol-grips'}
                    element={[
                        <PistolGrips
                            sessionID={sessionID}
                            key="pistol-grips-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/barter-items'}
                    element={[
                        <BarterItems
                            sessionID={sessionID}
                            key="barter-items-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/containers'}
                    element={[
                        <Containers
                            sessionID={sessionID}
                            key="containers-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/food-and-drink'}
                    element={[
                        <Provisions
                            sessionID={sessionID}
                            key="provisions-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/grenades'}
                    element={[
                        <Grenades
                            sessionID={sessionID}
                            key="grenades-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/headphones'}
                    element={[
                        <Headsets
                            sessionID={sessionID}
                            key="headsets-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/headsets'}
                    element={[
                        <Headsets
                            sessionID={sessionID}
                            key="headsets-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/keys'}
                    element={[
                        <Keys sessionID={sessionID} key="keys-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/items/provisions'}
                    element={[
                        <Provisions
                            sessionID={sessionID}
                            key="provisions-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/bosses'}
                    element={[
                        <Suspense fallback={<Loading />} key="bosses-wrapper-suspense">
                            <Bosses sessionID={sessionID} key="bosses-wrapper" />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/boss'}
                    element={[
                        <Navigate to="/bosses" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/boss/:bossName'}
                    element={[
                        <Suspense fallback={<Loading />} key="specific-boss-wrapper-suspense">
                            <Boss sessionID={sessionID} key="specific-boss-wrapper" />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/traders'}
                    element={[
                        <Traders sessionID={sessionID} key="traders-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/traders/:traderName'}
                    element={[
                        <Trader sessionID={sessionID} key="trader-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/hideout-profit/'}
                    element={[
                        <Crafts key="hideout-profit-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/item-tracker/'}
                    element={[
                        <ItemTracker key="item-tracker-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/item/:itemName'}
                    element={[
                        <Item
                            sessionID={sessionID}
                            key="specific-item-wrapper"
                        />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/debug/'}
                    element={[
                        <Debug key="debug-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/about'}
                    element={[
                        <About key="about-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/api/'}
                    element={[
                        <Suspense fallback={<Loading />} key="api-docs-wrapper">
                            <APIDocs />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/nightbot/'}
                    element={[
                        <Suspense
                            fallback={<Loading />}
                            key="nightbot-docs-wrapper"
                        >
                            <Nightbot />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/streamelements/'}
                    element={[
                        <Suspense
                            fallback={<Loading />}
                            key="streamelements-docs-wrapper"
                        >
                            <StreamElements />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/moobot'}
                    element={[
                        <Suspense
                            fallback={<Loading />}
                            key="moobot-docs-wrapper"
                        >
                            <Moobot />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/api-users/'}
                    element={[
                        <Suspense
                            fallback={<Loading />}
                            key="api-users-wrapper"
                        >
                            <ApiUsers />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/history-graphs'}
                    element={[
                        <Suspense
                            fallback={<Loading />}
                            key="history-graphs-wrapper"
                        >
                            <HistoryGraphs />
                        </Suspense>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/hideout'}
                    element={[
                        <Hideout key="hideout-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/wipe-length'}
                    element={[
                        <WipeLength key="wipe-length-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/bitcoin-farm-calculator'}
                    element={[
                        <BitcoinFarmCalculator key="bitcoin-farm-calculator" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/settings/'}
                    element={[
                        <Settings key="settings-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route path={'/control'} element={[<Control send={send} />]} />
                <Route
                    path={'/guides/:guideKey'}
                    element={[<Guides send={send} />]}
                />
                <Route
                    path="/items/:bsgCategoryName"
                    element={[
                        <div
                            className="display-wrapper"
                            key="bsg-category-items-wrapper"
                        >
                            <BsgCategory />
                        </div>,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/tasks/'}
                    element={[
                        <Quests key="quests-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path={'/task/:taskIdentifier'}
                    element={[
                        <Quest key="quest-wrapper" />,
                        remoteControlSessionElement,
                    ]}
                />
                <Route
                    path="*"
                    element={[<ErrorPage />, remoteControlSessionElement]}
                />
            </Routes>
            {/* </Suspense> */}
            <Footer />
        </div>
    );
}

export default App;
