import type { ExternalPluginConfig } from '@windy/interfaces.d';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-aircraft-range',
    version: '1.0.0',
    title: 'Aircraft range',
    description: 'This plugin demonstrates capabilities of Windy Plugin System.',
    author: 'IL (Windy.com)',
    repository: 'https://github.com/windycom/windy-plugins',
    desktopUI: 'rhpane',
    mobileUI: 'small',

    // This plugin can be opened from URL
    // https://www.windy.com/plugin/route-path/:lat/:lon
    routerPath: '/aircraft-range/:lat?/:lon?',

    // Whenever user clicks on map and plugin i opened,
    // singleclick events is emitted with name of this plugin
    listenToSingleclick: true,
};

export default config;
