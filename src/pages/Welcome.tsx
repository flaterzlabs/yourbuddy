import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { RoleCard } from '@/components/role-card';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { User, Users, GraduationCap } from 'lucide-react';

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const selectedRole = 'student'; // Fixed role for students

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleContinue = () => {
    navigate('/auth', { state: { signUp: true, selectedRole } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-6 md:px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <BuddyLogo size="lg" />
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-sm sm:max-w-2xl md:max-w-4xl mx-auto text-center">
          <div className="mb-8 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Welcome to ThriveSprite
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg md:max-w-2xl mx-auto leading-relaxed px-4 md:px-0">
              A special communication platform for neurodivergent children, connecting students with their caregivers and educators in a simple and caring way.
            </p>
          </div>

          {/* Student Focus Section */}
         <div className="mb-8 md:mb-12">
   <div className="max-w-xs sm:max-w-sm mx-auto">
     <RoleCard
       title="Student"
       description="I am a student and I want to ask for help when I need it"
       icon={User}
       selected={true}
       onClick={() => {}}
     />
   </div>
</div>

        {/* Continue Button */}
<div className="flex flex-col items-center gap-4">
  <div className="flex flex-col sm:flex-row sm:justify-center gap-3 sm:gap-4 w-full max-w-md">
    <Button
      variant="hero"
      size="lg"
      onClick={handleContinue}
      className="px-8 sm:px-12 w-full sm:w-auto transition-all duration-300 ease-in-out 
                 hover:scale-105 active:scale-95"
    >
      Get Started
    </Button>

    <Button
      variant="outline"
      size="lg"
      onClick={() => navigate('/auth')}
      className="px-6 sm:px-8 w-full sm:w-auto transition-all duration-300 ease-in-out 
                 hover:scale-105 active:scale-95 hover:bg-gradient-primary hover:text-white hover:border-transparent"
    >
      I have an account
    </Button>
  </div>
</div>

            
            {/* Link for Parents/Educators */}
            <button
              onClick={() => navigate('/caregiver-auth')}
              className="text-primary hover:underline text-sm font-medium mt-4"
            >
              Are you a parent or educator? Click here
            </button>
          

          {/* Features Preview */}
          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-2">Personal Avatar</h3>
              <p className="text-sm text-muted-foreground">Choose your unique avatar</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold mb-2">Secure Connection</h3>
              <p className="text-sm text-muted-foreground">Safe and private communication with trusted adults</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Easy to Use</h3>
              <p className="text-sm text-muted-foreground">Simple interface designed for students</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}