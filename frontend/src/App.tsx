import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import store from './store';
import Router from './router';
import './styles/global.css';

function App() {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <ConfigProvider locale={zhCN}>
          <BrowserRouter>
            <Router />
          </BrowserRouter>
        </ConfigProvider>
      </Provider>
    </HelmetProvider>
  );
}

export default App;
