import React, {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter, useLocation} from 'react-router-dom';
import {App} from './App';
import './style.css';
function ScrollReset() {
  const {pathname} = useLocation();
  useEffect(() => {window.scrollTo(0,0)}, [pathname]);
  return null;
}
createRoot(document.getElementById('root')!).render(<HashRouter><ScrollReset/><App /></HashRouter>);
