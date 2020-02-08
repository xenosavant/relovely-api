
export interface ProfileData {
  logging_page_id: string;
  show_suggested_profiles: boolean;
  show_follow_dialog: boolean;
  graphql: Graphql;
  toast_content_on_load?: any;
}

export interface EdgeFollowedBy {
  count: number;
}

export interface EdgeFollow {
  count: number;
}

export interface EdgeMutualFollowedBy {
  count: number;
  edges: any[];
}

export interface PageInfo {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeFelixCombinedPostUploads {
  count: number;
  page_info: PageInfo;
  edges: any[];
}

export interface PageInfo2 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeFelixCombinedDraftUploads {
  count: number;
  page_info: PageInfo2;
  edges: any[];
}

export interface PageInfo3 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeFelixVideoTimeline {
  count: number;
  page_info: PageInfo3;
  edges: any[];
}

export interface PageInfo4 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeFelixDrafts {
  count: number;
  page_info: PageInfo4;
  edges: any[];
}

export interface PageInfo5 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeFelixPendingPostUploads {
  count: number;
  page_info: PageInfo5;
  edges: any[];
}

export interface PageInfo6 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeFelixPendingDraftUploads {
  count: number;
  page_info: PageInfo6;
  edges: any[];
}

export interface PageInfo7 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeMediaToCaption {
  edges: any[];
}

export interface EdgeMediaToComment {
  count: number;
}

export interface Dimensions {
  height: number;
  width: number;
}

export interface EdgeLikedBy {
  count: number;
}

export interface EdgeMediaPreviewLike {
  count: number;
}

export interface Owner {
  id: string;
  username: string;
}

export interface ThumbnailResource {
  src: string;
  config_width: number;
  config_height: number;
}

export interface Node {
  __typename: string;
  id: string;
  edge_media_to_caption: EdgeMediaToCaption;
  shortcode: string;
  edge_media_to_comment: EdgeMediaToComment;
  comments_disabled: boolean;
  taken_at_timestamp: number;
  dimensions: Dimensions;
  display_url: string;
  edge_liked_by: EdgeLikedBy;
  edge_media_preview_like: EdgeMediaPreviewLike;
  location?: any;
  gating_info?: any;
  fact_check_overall_rating?: any;
  fact_check_information?: any;
  media_preview: string;
  owner: Owner;
  thumbnail_src: string;
  thumbnail_resources: ThumbnailResource[];
  is_video: boolean;
  accessibility_caption: string;
}

export interface Edge {
  node: Node;
}

export interface EdgeOwnerToTimelineMedia {
  count: number;
  page_info: PageInfo7;
  edges: Edge[];
}

export interface PageInfo8 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeSavedMedia {
  count: number;
  page_info: PageInfo8;
  edges: any[];
}

export interface PageInfo9 {
  has_next_page: boolean;
  end_cursor?: any;
}

export interface EdgeMediaCollections {
  count: number;
  page_info: PageInfo9;
  edges: any[];
}

export interface User {
  biography: string;
  blocked_by_viewer: boolean;
  restricted_by_viewer: boolean;
  country_block: boolean;
  external_url: string;
  external_url_linkshimmed: string;
  edge_followed_by: EdgeFollowedBy;
  followed_by_viewer: boolean;
  edge_follow: EdgeFollow;
  follows_viewer: boolean;
  full_name: string;
  has_channel: boolean;
  has_blocked_viewer: boolean;
  highlight_reel_count: number;
  has_requested_viewer: boolean;
  id: string;
  is_business_account: boolean;
  is_joined_recently: boolean;
  business_category_name: string;
  is_private: boolean;
  is_verified: boolean;
  edge_mutual_followed_by: EdgeMutualFollowedBy;
  profile_pic_url: string;
  profile_pic_url_hd: string;
  requested_by_viewer: boolean;
  username: string;
  connected_fb_page?: any;
  edge_felix_combined_post_uploads: EdgeFelixCombinedPostUploads;
  edge_felix_combined_draft_uploads: EdgeFelixCombinedDraftUploads;
  edge_felix_video_timeline: EdgeFelixVideoTimeline;
  edge_felix_drafts: EdgeFelixDrafts;
  edge_felix_pending_post_uploads: EdgeFelixPendingPostUploads;
  edge_felix_pending_draft_uploads: EdgeFelixPendingDraftUploads;
  edge_owner_to_timeline_media: EdgeOwnerToTimelineMedia;
  edge_saved_media: EdgeSavedMedia;
  edge_media_collections: EdgeMediaCollections;
}

export interface Graphql {
  user: User;
}


