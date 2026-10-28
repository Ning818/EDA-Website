import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import Layout from './components/Layout'
import { RequireAuth, RequireGrant } from './components/guards'
import AccountEdit from './pages/AccountEdit'
import AccountNew from './pages/AccountNew'
import Accounts from './pages/Accounts'
import ChangePassword from './pages/ChangePassword'
import FundedSentence from './pages/FundedSentence'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import PersonNew from './pages/PersonNew'
import PersonPage from './pages/PersonPage'
import People from './pages/People'
import ProjectNew from './pages/ProjectNew'
import ProjectPage from './pages/ProjectPage'
import Projects from './pages/Projects'

const PEOPLE = ['people_add', 'people_edit', 'people_delete']
const PROJECTS = ['projects']

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="people" element={<RequireGrant areas={PEOPLE}><People /></RequireGrant>} />
            <Route path="people/new" element={<RequireGrant areas={['people_add']}><PersonNew /></RequireGrant>} />
            <Route path="people/:slug" element={<RequireGrant areas={PEOPLE}><PersonPage /></RequireGrant>} />
            <Route path="projects" element={<RequireGrant areas={PROJECTS}><Projects /></RequireGrant>} />
            <Route path="projects/new" element={<RequireGrant areas={PROJECTS}><ProjectNew /></RequireGrant>} />
            <Route path="projects/sentence/:slug" element={<RequireGrant areas={PROJECTS}><FundedSentence /></RequireGrant>} />
            <Route path="projects/:id" element={<RequireGrant areas={PROJECTS}><ProjectPage /></RequireGrant>} />
            <Route path="accounts" element={<RequireGrant areas={['accounts']}><Accounts /></RequireGrant>} />
            <Route path="accounts/new" element={<RequireGrant areas={['accounts']}><AccountNew /></RequireGrant>} />
            <Route path="accounts/:id" element={<RequireGrant areas={['accounts']}><AccountEdit /></RequireGrant>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
