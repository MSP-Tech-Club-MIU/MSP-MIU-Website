import { Navigate } from 'react-router-dom';

/** Legacy route — Registration Admin now lives under /admin/registrations */
const FormAdmin = () => <Navigate to="/admin/registrations" replace />;

export default FormAdmin;
