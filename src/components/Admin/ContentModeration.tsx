
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Eye, Flag, MessageSquare, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  symbol: string;
  created_at: string;
  updated_at: string;
  flagged?: boolean;
  moderation_notes?: string;
}

interface ModerationStats {
  totalComments: number;
  flaggedComments: number;
  activeUsers: number;
  commentsToday: number;
}

const ContentModeration = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    totalComments: 0,
    flaggedComments: 0,
    activeUsers: 0,
    commentsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
    fetchModerationStats();
  }, []);

  const fetchComments = async () => {
    try {
      const { data: allComments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (commentsError) throw commentsError;

      setComments(allComments || []);
      setFlaggedComments((allComments || []).filter(comment => comment.flagged));
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationStats = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, user_id, created_at, flagged');

      if (error) throw error;

      const today = new Date().toDateString();
      const commentsToday = commentsData?.filter(
        comment => new Date(comment.created_at).toDateString() === today
      ).length || 0;

      const uniqueUsers = new Set(commentsData?.map(comment => comment.user_id)).size;
      const flaggedCount = commentsData?.filter(comment => comment.flagged).length || 0;

      setStats({
        totalComments: commentsData?.length || 0,
        flaggedComments: flaggedCount,
        activeUsers: uniqueUsers,
        commentsToday
      });
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });

      fetchComments();
      fetchModerationStats();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  };

  const flagComment = async (commentId: string, flagged: boolean) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ 
          flagged,
          moderation_notes: moderationNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Comment ${flagged ? 'flagged' : 'unflagged'} successfully`,
      });

      fetchComments();
      fetchModerationStats();
      setSelectedComment(null);
      setModerationNotes('');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    }
  };

  const renderCommentsTable = (commentsData: Comment[], showActions = true) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Content</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {commentsData.map((comment) => (
          <TableRow key={comment.id}>
            <TableCell className="max-w-xs">
              <div className="truncate">{comment.content}</div>
            </TableCell>
            <TableCell>
              <div className="text-sm text-muted-foreground">
                {comment.user_id.substring(0, 8)}...
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{comment.symbol}</Badge>
            </TableCell>
            <TableCell>
              {new Date(comment.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {comment.flagged ? (
                <Badge variant="destructive">Flagged</Badge>
              ) : (
                <Badge variant="secondary">Normal</Badge>
              )}
            </TableCell>
            {showActions && (
              <TableCell>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedComment(comment);
                          setModerationNotes(comment.moderation_notes || '');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Moderate Comment</DialogTitle>
                        <DialogDescription>
                          Review and take action on this comment
                        </DialogDescription>
                      </DialogHeader>
                      {selectedComment && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold">Comment Content</h4>
                            <p className="text-sm bg-muted p-3 rounded">
                              {selectedComment.content}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Moderation Notes</h4>
                            <Textarea
                              value={moderationNotes}
                              onChange={(e) => setModerationNotes(e.target.value)}
                              placeholder="Add moderation notes..."
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button
                              onClick={() => deleteComment(selectedComment.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                            <Button
                              onClick={() => flagComment(selectedComment.id, !selectedComment.flagged)}
                              variant="outline"
                              size="sm"
                            >
                              <Flag className="h-4 w-4 mr-1" />
                              {selectedComment.flagged ? 'Unflag' : 'Flag'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (loading) {
    return <div>Loading content moderation...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Comments</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.flaggedComments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.commentsToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>
            Monitor and moderate user-generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Comments</TabsTrigger>
              <TabsTrigger value="flagged">Flagged Comments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {renderCommentsTable(comments)}
            </TabsContent>
            
            <TabsContent value="flagged">
              {flaggedComments.length > 0 ? (
                renderCommentsTable(flaggedComments)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No flagged comments found
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentModeration;
