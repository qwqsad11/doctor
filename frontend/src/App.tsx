import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import store from './store';
import Router from './router';
import './styles/global.css';

function App() {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <ConfigProvider locale={enUS}>
          <BrowserRouter>
            <Router />
          </BrowserRouter>
        </ConfigProvider>
      </Provider>
    </HelmetProvider>
  );
}

export default App;
