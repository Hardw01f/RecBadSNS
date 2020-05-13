class FriendsController < ApplicationController
  before_action :authenticate_user!

  def create
    user = User.find_by login_id: params[:login_id]
    render json: {errors: ['指定されたユーザは存在しません']}, status: :bad_request and return if user.nil?
    friend = @current_user.friends_from.create to_user_id: user[:id]
    render json: {errors: friend.errors.full_messages}, status: :bad_request and return if friend.errors.any?
    render json: {} and return
  end

  def index
    friend_ids = @current_user.friend_ids
    render json: {} and return if friend_ids.empty?
    order = params[:order]
    if order == 'name DESC'then
      order = 'DESC'
    else
      order = 'ASC'
    end
    friends = User.where(id: friend_ids).order(name: order)
    render json: {friends: friends} and return
  end

  def search
    ignore_ids = [@current_user.id] + @current_user.friend_ids
    friends = User.where("name LIKE ?","%#{params[:name]}%").where.not(id: ignore_ids).order(name: "ASC")
    render json: {friends: friends} and return
  end
end
