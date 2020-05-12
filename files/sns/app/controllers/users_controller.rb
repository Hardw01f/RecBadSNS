class UsersController < ApplicationController
  before_action :authenticate_user!, only: [:index]
  before_action :reject_non_admin_user, only: [:index]

  def index
    # Admin Only
    render json: {users: User.all}
  end

  def create
    params[:user][:icon_file_name].gsub!(/^.*(\\|\/)/, '')
    params[:user][:icon_file_name].gsub!(/[^A-Za-z0-9\.\-]/, '_')
    user = User.create params[:user].permit(:name, :login_id, :email, :pass, :icon_file_name, :admin)
    render json: {errors: user.errors.full_messages}, status: :bad_request and return if user.errors.any?
    UserMailer.with(user: user, url: request.base_url).welcome.deliver_later
    log_in user
    render json: {name: user.name, icon: icon_user_path(user)} and return
  end

  def icon
    user = User.find_by id: params[:id]
    send_data File.read "#{Rails.root}/public/images/default.png", disposition: 'inline' and return if user.nil?
    begin
      icon_name = user[:icon_file_name]
      send_data File.read "#{Rails.root}/public/icons/"+icon_name, disposition: 'inline'
    rescue
      presets = Dir["#{Rails.root}/public/icons/presets/*"].sort
      send_data File.read presets[user.id % presets.length], disposition: 'inline'
    end
  end
end
