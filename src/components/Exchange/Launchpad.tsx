import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { LaunchpadService, LaunchpadProject, LaunchpadSubscription } from '@/services/LaunchpadService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Rocket, Clock, Users, ExternalLink, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Launchpad = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<LaunchpadProject | null>(null);
  const [subscribeAmount, setSubscribeAmount] = useState('');
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);

  const { data: upcomingProjects = [] } = useQuery({
    queryKey: ['launchpad-projects', 'upcoming'],
    queryFn: () => LaunchpadService.getProjects('upcoming')
  });

  const { data: activeProjects = [] } = useQuery({
    queryKey: ['launchpad-projects', 'active'],
    queryFn: () => LaunchpadService.getProjects('active')
  });

  const { data: completedProjects = [] } = useQuery({
    queryKey: ['launchpad-projects', 'completed'],
    queryFn: () => LaunchpadService.getProjects('completed')
  });

  const { data: mySubscriptions = [] } = useQuery({
    queryKey: ['launchpad-subscriptions', user?.id],
    queryFn: () => user ? LaunchpadService.getMySubscriptions(user.id) : [],
    enabled: !!user
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedProject) throw new Error('Invalid state');
      return LaunchpadService.subscribe(user.id, selectedProject.id, parseFloat(subscribeAmount));
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Successfully subscribed!');
        setSubscribeDialogOpen(false);
        setSubscribeAmount('');
        queryClient.invalidateQueries({ queryKey: ['launchpad-subscriptions'] });
        queryClient.invalidateQueries({ queryKey: ['launchpad-projects'] });
      } else {
        toast.error(result.error || 'Subscription failed');
      }
    }
  });

  const claimMutation = useMutation({
    mutationFn: LaunchpadService.claimTokens,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Tokens claimed successfully!');
        queryClient.invalidateQueries({ queryKey: ['launchpad-subscriptions'] });
      } else {
        toast.error(result.error || 'Claim failed');
      }
    }
  });

  const handleSubscribeClick = (project: LaunchpadProject) => {
    setSelectedProject(project);
    setSubscribeDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-yellow-500';
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const ProjectCard = ({ project }: { project: LaunchpadProject }) => {
    const progress = LaunchpadService.getProgress(project);
    const timeRemaining = LaunchpadService.getTimeRemaining(project);

    return (
      <Card className="overflow-hidden hover:border-primary transition-colors">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
          {project.logo_url ? (
            <img src={project.logo_url} alt={project.name} className="h-16 w-16 rounded-full" />
          ) : (
            <Rocket className="h-16 w-16 text-primary/50" />
          )}
        </div>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{project.name}</h3>
              <p className="text-sm text-muted-foreground">${project.symbol}</p>
            </div>
            <Badge className={cn(getStatusColor(project.status), 'text-white')}>
              {project.status}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {project.description || 'No description available'}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token Price</span>
              <span className="font-medium">${project.price_per_token} {project.payment_currency}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Raise</span>
              <span className="font-medium">
                ${(project.total_tokens * project.price_per_token).toLocaleString()}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeRemaining}
              </span>
              <div className="flex gap-2">
                {project.website_url && (
                  <a href={project.website_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </a>
                )}
                {project.whitepaper_url && (
                  <a href={project.whitepaper_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <Button 
            className="w-full mt-4"
            onClick={() => handleSubscribeClick(project)}
            disabled={project.status !== 'active'}
          >
            {project.status === 'upcoming' ? 'Coming Soon' : 
             project.status === 'active' ? 'Subscribe Now' : 'Ended'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Launchpad</h1>
          <p className="text-muted-foreground">Discover and invest in new token launches</p>
        </div>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">All Projects</TabsTrigger>
          <TabsTrigger value="subscriptions">My Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live Now
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Projects */}
          {upcomingProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Projects */}
          {completedProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {activeProjects.length === 0 && upcomingProjects.length === 0 && completedProjects.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No launchpad projects available at the moment.</p>
                <p className="text-sm">Check back soon for new token launches!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscriptions">
          {mySubscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                You haven't subscribed to any projects yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mySubscriptions.map(sub => (
                <Card key={sub.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{sub.project?.name}</h3>
                        <p className="text-sm text-muted-foreground">${sub.project?.symbol}</p>
                      </div>
                      <Badge variant="outline">{sub.payment_status}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Committed</div>
                        <div className="font-medium">{sub.committed_amount} {sub.project?.payment_currency}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Tokens Allocated</div>
                        <div className="font-medium">{sub.tokens_allocated.toFixed(2)} {sub.project?.symbol}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Status</div>
                        <div className="font-medium">
                          {sub.tokens_claimed ? 'Claimed' : 'Pending'}
                        </div>
                      </div>
                    </div>

                    {!sub.tokens_claimed && sub.project?.status === 'completed' && (
                      <Button 
                        className="mt-4"
                        onClick={() => claimMutation.mutate(sub.id)}
                        disabled={claimMutation.isPending}
                      >
                        Claim Tokens
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedProject?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Price</span>
                <span>${selectedProject?.price_per_token} {selectedProject?.payment_currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min. Purchase</span>
                <span>{selectedProject?.min_purchase} {selectedProject?.payment_currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max. Purchase</span>
                <span>{selectedProject?.max_purchase} {selectedProject?.payment_currency}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount ({selectedProject?.payment_currency})</Label>
              <Input
                type="number"
                placeholder={`Min. ${selectedProject?.min_purchase}`}
                value={subscribeAmount}
                onChange={(e) => setSubscribeAmount(e.target.value)}
              />
              {subscribeAmount && (
                <p className="text-sm text-muted-foreground">
                  You will receive ~{(parseFloat(subscribeAmount) / (selectedProject?.price_per_token || 1)).toFixed(2)} {selectedProject?.symbol}
                </p>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={() => subscribeMutation.mutate()}
              disabled={
                subscribeMutation.isPending || 
                !subscribeAmount || 
                parseFloat(subscribeAmount) < (selectedProject?.min_purchase || 0) ||
                parseFloat(subscribeAmount) > (selectedProject?.max_purchase || Infinity)
              }
            >
              {subscribeMutation.isPending ? 'Subscribing...' : 'Confirm Subscription'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
