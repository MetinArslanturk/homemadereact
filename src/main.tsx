import './example/style.css';
import { render, _jsx_createElement } from './homemadereact';
import App from "./example/App";

// Render an example app
render(<App />, document.getElementById('app')!);
