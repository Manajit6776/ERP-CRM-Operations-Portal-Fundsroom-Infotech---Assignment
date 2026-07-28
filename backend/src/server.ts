import app from './app';
import { ENV } from './config/env';

app.listen(ENV.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Mini ERP + CRM Operations Portal Backend API Server`);
  console.log(`📡 Running on: http://localhost:${ENV.PORT}`);
  console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
  console.log(`=======================================================`);
});
