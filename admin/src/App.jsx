import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import Layout from './components/Layout'
import { RequireAuth, RequireGrant } from './components/guards'
import AccountEdit from './pages/AccountEdit'
import AccountNew from './pages/AccountNew'
import AuditLog from './pages/AuditLog'
import BrokenLinks from './pages/BrokenLinks'
import Accounts from './pages/Accounts'
import ChangePassword from './pages/ChangePassword'
import CollaboratorNew from './pages/CollaboratorNew'
import CollaboratorPage from './pages/CollaboratorPage'
import Collaborations from './pages/Collaborations'
import FooterNumbers from './pages/FooterNumbers'
import FundedSentence from './pages/FundedSentence'
import Help from './pages/Help'
import Home from './pages/Home'
import JointProjectNew from './pages/JointProjectNew'
import JointProjectPage from './pages/JointProjectPage'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import PageIntros from './pages/PageIntros'
import PersonNew from './pages/PersonNew'
import PersonPage from './pages/PersonPage'
import People from './pages/People'
import ProjectNew from './pages/ProjectNew'
import ProjectPage from './pages/ProjectPage'
import Projects from './pages/Projects'
import Requests from './pages/Requests'
import Site from './pages/Site'
import SocialMedia from './pages/SocialMedia'
import System from './pages/System'
import ThemeArea from './pages/ThemeArea'
import ThemeAreas from './pages/ThemeAreas'
import ThemeContacts from './pages/ThemeContacts'
import ThemeHighlight from './pages/ThemeHighlight'
import ThemePage from './pages/ThemePage'
import ThemeWords from './pages/ThemeWords'
import Themes from './pages/Themes'

const PEOPLE = ['people_add', 'people_edit', 'people_delete']
const PROJECTS = ['projects']
const SITE = ['site']
const THEME = ['theme']
const ANY = ['people_add', 'people_edit', 'people_delete', 'site', 'projects', 'theme', 'accounts', 'system']
const LINKS = ['people_edit', 'site', 'projects', 'theme']

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
            <Route path="collaborations" element={<RequireGrant areas={SITE}><Collaborations /></RequireGrant>} />
            <Route path="collaborators/new" element={<RequireGrant areas={SITE}><CollaboratorNew /></RequireGrant>} />
            <Route path="collaborators/:id" element={<RequireGrant areas={SITE}><CollaboratorPage /></RequireGrant>} />
            <Route path="joint-projects/new" element={<RequireGrant areas={SITE}><JointProjectNew /></RequireGrant>} />
            <Route path="joint-projects/:id" element={<RequireGrant areas={SITE}><JointProjectPage /></RequireGrant>} />
            <Route path="site" element={<RequireGrant areas={SITE}><Site /></RequireGrant>} />
            <Route path="site/footer" element={<RequireGrant areas={SITE}><FooterNumbers /></RequireGrant>} />
            <Route path="site/intros" element={<RequireGrant areas={SITE}><PageIntros /></RequireGrant>} />
            <Route path="site/social" element={<RequireGrant areas={SITE}><SocialMedia /></RequireGrant>} />
            <Route path="themes" element={<RequireGrant areas={THEME}><Themes /></RequireGrant>} />
            <Route path="themes/:slug" element={<RequireGrant areas={THEME}><ThemePage /></RequireGrant>} />
            <Route path="themes/:slug/words" element={<RequireGrant areas={THEME}><ThemeWords /></RequireGrant>} />
            <Route path="themes/:slug/contacts" element={<RequireGrant areas={THEME}><ThemeContacts /></RequireGrant>} />
            <Route path="themes/:slug/areas" element={<RequireGrant areas={THEME}><ThemeAreas /></RequireGrant>} />
            <Route path="themes/:slug/areas/:id" element={<RequireGrant areas={THEME}><ThemeArea /></RequireGrant>} />
            <Route path="themes/:slug/highlights/:kind" element={<RequireGrant areas={THEME}><ThemeHighlight /></RequireGrant>} />
            <Route path="links" element={<RequireGrant areas={LINKS}><BrokenLinks /></RequireGrant>} />
            <Route path="help" element={<RequireGrant areas={ANY}><Help /></RequireGrant>} />
            <Route path="audit" element={<RequireGrant areas={['system']}><AuditLog /></RequireGrant>} />
            <Route path="system" element={<RequireGrant areas={['system']}><System /></RequireGrant>} />
            <Route path="requests" element={<RequireGrant areas={['system']}><Requests /></RequireGrant>} />
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
