import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { AppProvider } from './context/AuthContext'
import { Protegida } from './components/Layout'
import { IconChip } from './components/ui'
import { Login, Recuperar, Registro, Restablecer } from './pages/Auth'
import Inicio from './pages/Inicio'
import Consulta from './pages/Consulta'
import Expediente from './pages/Expediente'
import Perfil from './pages/Perfil'

function NoEncontrada() {
  return (
    <div className="center-page">
      <div>
        <IconChip icon={Compass} size="lg" />
        <h1 className="h-page">No encontramos esta página</h1>
        <p className="muted">El enlace puede estar roto o la página ya no existe.</p>
        <Link to="/" className="btn btn-primary">Volver al inicio</Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/ingresar" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/restablecer" element={<Restablecer />} />
          <Route element={<Protegida />}>
            <Route index element={<Inicio />} />
            <Route path="/consulta" element={<Consulta />} />
            <Route path="/expediente/:seccion?" element={<Expediente />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
