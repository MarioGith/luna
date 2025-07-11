"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  User, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  UserPlus,
  UserCheck,
  UserX,
  Eye,
  FileText,
  Mic,
  Clock,
  Star,
  Settings,
  Filter,
  Grid3X3,
  List,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Tag,
  Activity,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Speaker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    transcriptionSpeakers: number;
  };
  transcriptionSpeakers?: Array<{
    id: string;
    transcriptionId: string;
    detectedSpeakerLabel: string;
    segments?: string;
    confidence?: number;
    transcription: {
      id: string;
      fileName: string;
      createdAt: string;
    };
  }>;
}

interface SpeakerStats {
  totalSpeakers: number;
  verifiedSpeakers: number;
  unverifiedSpeakers: number;
  recentlyActive: number;
  totalTranscriptions: number;
  averageConfidence: number;
}

type ViewMode = "grid" | "list";
type SortBy = "newest" | "oldest" | "name" | "activity" | "transcriptions";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [filteredSpeakers, setFilteredSpeakers] = useState<Speaker[]>([]);
  const [stats, setStats] = useState<SpeakerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterByVerified, setFilterByVerified] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    fetchSpeakers();
  }, []);

  useEffect(() => {
    filterAndSortSpeakers();
  }, [speakers, searchQuery, sortBy, filterByVerified]);

  const fetchSpeakers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/speakers");
      const data = await response.json();
      setSpeakers(data.speakers || []);
      
      // Calculate stats
      const totalSpeakers = data.speakers?.length || 0;
      const verifiedSpeakers = data.speakers?.filter((s: Speaker) => s.isVerified).length || 0;
      const unverifiedSpeakers = totalSpeakers - verifiedSpeakers;
      const recentlyActive = data.speakers?.filter((s: Speaker) => 
        new Date(s.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length || 0;
      const totalTranscriptions = data.speakers?.reduce((sum: number, s: Speaker) => 
        sum + s._count.transcriptionSpeakers, 0
      ) || 0;

      setStats({
        totalSpeakers,
        verifiedSpeakers,
        unverifiedSpeakers,
        recentlyActive,
        totalTranscriptions,
        averageConfidence: 0.85, // This would be calculated from actual data
      });
    } catch (error) {
      console.error("Error fetching speakers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortSpeakers = () => {
    let filtered = [...speakers];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(speaker =>
        speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.phone?.includes(searchQuery) ||
        speaker.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply verification filter
    if (filterByVerified !== "all") {
      filtered = filtered.filter(speaker => 
        filterByVerified === "verified" ? speaker.isVerified : !speaker.isVerified
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "activity":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "transcriptions":
          return b._count.transcriptionSpeakers - a._count.transcriptionSpeakers;
        default:
          return 0;
      }
    });

    setFilteredSpeakers(filtered);
  };

  const handleCreateSpeaker = async () => {
    try {
      const response = await fetch("/api/speakers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newSpeaker = await response.json();
        setSpeakers(prev => [newSpeaker, ...prev]);
        setIsCreateDialogOpen(false);
        setFormData({ name: "", email: "", phone: "", notes: "" });
        alert("Speaker created successfully!");
      } else {
        throw new Error("Failed to create speaker");
      }
    } catch (error) {
      console.error("Error creating speaker:", error);
      alert("Failed to create speaker");
    }
  };

  const handleEditSpeaker = async () => {
    if (!editingSpeaker) return;

    try {
      const response = await fetch(`/api/speakers/${editingSpeaker.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedSpeaker = await response.json();
        setSpeakers(prev => prev.map(s => s.id === editingSpeaker.id ? updatedSpeaker : s));
        setIsEditDialogOpen(false);
        setEditingSpeaker(null);
        setFormData({ name: "", email: "", phone: "", notes: "" });
        alert("Speaker updated successfully!");
      } else {
        throw new Error("Failed to update speaker");
      }
    } catch (error) {
      console.error("Error updating speaker:", error);
      alert("Failed to update speaker");
    }
  };

  const handleDeleteSpeaker = async (speakerId: string) => {
    if (!confirm("Are you sure you want to delete this speaker? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/speakers/${speakerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSpeakers(prev => prev.filter(s => s.id !== speakerId));
        alert("Speaker deleted successfully!");
      } else {
        throw new Error("Failed to delete speaker");
      }
    } catch (error) {
      console.error("Error deleting speaker:", error);
      alert("Failed to delete speaker");
    }
  };

  const handleToggleVerification = async (speakerId: string, isVerified: boolean) => {
    try {
      const response = await fetch(`/api/speakers/${speakerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isVerified: !isVerified }),
      });

      if (response.ok) {
        const updatedSpeaker = await response.json();
        setSpeakers(prev => prev.map(s => s.id === speakerId ? updatedSpeaker : s));
        alert(`Speaker ${!isVerified ? "verified" : "unverified"} successfully!`);
      } else {
        throw new Error("Failed to update speaker");
      }
    } catch (error) {
      console.error("Error updating speaker:", error);
      alert("Failed to update speaker");
    }
  };

  const openEditDialog = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setFormData({
      name: speaker.name,
      email: speaker.email || "",
      phone: speaker.phone || "",
      notes: speaker.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Speaker Management</h1>
          <p className="text-gray-600">
            Manage and organize your detected speakers ({filteredSpeakers.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Speaker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Speaker</DialogTitle>
                <DialogDescription>
                  Create a new speaker profile to assign to transcriptions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter speaker name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this speaker"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateSpeaker} disabled={!formData.name.trim()}>
                    Create Speaker
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Speakers</p>
                  <p className="text-2xl font-bold">{stats.totalSpeakers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-2xl font-bold">{stats.verifiedSpeakers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unverified</p>
                  <p className="text-2xl font-bold">{stats.unverifiedSpeakers}</p>
                </div>
                <UserX className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Transcriptions</p>
                  <p className="text-2xl font-bold">{stats.totalTranscriptions}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search speakers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="transcriptions">Transcriptions</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterByVerified} onValueChange={setFilterByVerified}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Speakers Grid/List */}
      {filteredSpeakers.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No speakers found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterByVerified !== "all"
                  ? "Try adjusting your search or filters"
                  : "Speakers will be automatically detected from transcriptions, or you can add them manually"}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Speaker
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredSpeakers.map((speaker) => (
            <Card key={speaker.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{speaker.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {speaker.isVerified ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Star className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            Unverified
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {speaker._count.transcriptionSpeakers} transcriptions
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href={`/speakers/${speaker.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(speaker)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleVerification(speaker.id, speaker.isVerified)}>
                        {speaker.isVerified ? (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Unverify
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Verify
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteSpeaker(speaker.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {speaker.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{speaker.email}</span>
                    </div>
                  )}
                  {speaker.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{speaker.phone}</span>
                    </div>
                  )}
                  {speaker.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <Tag className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{speaker.notes}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-3 border-t text-xs text-gray-500">
                  <span>Created {formatDate(speaker.createdAt)}</span>
                  <span>Updated {formatDate(speaker.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Speaker</DialogTitle>
            <DialogDescription>
              Update the speaker's information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter speaker name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this speaker"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleEditSpeaker} disabled={!formData.name.trim()}>
                Update Speaker
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
