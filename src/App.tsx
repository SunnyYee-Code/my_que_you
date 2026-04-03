import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ActivitySlotConversionTracker from "@/components/home/ActivitySlotConversionTracker";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Home from "./pages/Home";
import Community from "./pages/Index";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Settings from "./pages/Settings";
import GroupDetail from "./pages/GroupDetail";
import GroupCreate from "./pages/GroupCreate";
import HostRequests from "./pages/HostRequests";
import MyGroups from "./pages/MyGroups";
import Chat from "./pages/Chat";
import DirectChat from "./pages/DirectChat";
import Friends from "./pages/Friends";
import Review from "./pages/Review";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CityProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ActivitySlotConversionTracker />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/community" element={<Community />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Protected routes */}
              <Route path="/profile/:id" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/profile/edit" element={<RequireAuth><ProfileEdit /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/group/:id" element={<RequireAuth><GroupDetail /></RequireAuth>} />
              <Route path="/group/create" element={<RequireAuth><GroupCreate /></RequireAuth>} />
              <Route path="/group/:id/chat" element={<RequireAuth><Chat /></RequireAuth>} />
              <Route path="/group/:id/review" element={<RequireAuth><Review /></RequireAuth>} />
              <Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
              <Route path="/dm/:friendId" element={<RequireAuth><DirectChat /></RequireAuth>} />
              <Route path="/host/requests" element={<RequireAuth><HostRequests /></RequireAuth>} />
              <Route path="/my-groups" element={<RequireAuth><MyGroups /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
