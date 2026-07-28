import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Courses from "@/pages/courses";
import CourseDetail from "@/pages/course-detail";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Vendors from "@/pages/vendors";
import VendorDetail from "@/pages/vendor-detail";
import Cart from "@/pages/cart";
import Orders from "@/pages/orders";
import Dashboard from "@/pages/dashboard";
import GamingHub from "@/pages/gaming-hub";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import PaymentSuccess from "@/pages/payment-success";
import HowToSell from "@/pages/how-to-sell";
import CreatorGuidelines from "@/pages/creator-guidelines";
import HelpCenter from "@/pages/help-center";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import PrivacyPolicy from "@/pages/privacy-policy";
import RefundPolicy from "@/pages/refund-policy";
import Sessions from "@/pages/sessions";
import Bookings from "@/pages/bookings";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/courses" component={Courses} />
        <Route path="/courses/:id" component={CourseDetail} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/vendors/:id" component={VendorDetail} />
        <Route path="/gaming-hub" component={GamingHub} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/cart" component={Cart} />
        <Route path="/orders" component={Orders} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/how-to-sell" component={HowToSell} />
        <Route path="/creator-guidelines" component={CreatorGuidelines} />
        <Route path="/help-center" component={HelpCenter} />
        <Route path="/contact" component={Contact} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/refund-policy" component={RefundPolicy} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={Admin} />
        {/* Catch-all must stay last — previously it sat above the legal and
            policy routes, so /privacy-policy and /refund-policy rendered the
            404 page instead of their content. */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
