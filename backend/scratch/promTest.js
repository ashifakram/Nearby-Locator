import { register } from '../utils/metrics.js';
register.metrics().then(console.log).catch(console.error);
