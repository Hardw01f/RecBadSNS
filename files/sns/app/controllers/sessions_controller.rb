class SessionsController < ApplicationController
  before_action :authenticate_user!, only: [:show, :clear]

  def create
    begin
      user_pass = Digest::MD5.hexdigest params[:pass]
      user = User.find_by(login_id: params[:login_id],pass:user_pass)
      log_in user
      render json: {name: user.name, icon: icon_user_path(user)} and return
    rescue
      render json: {errors: ['ログインに失敗しました']}, status: :bad_request and return
    end
  end

  def show
    render json: {name: @current_user.name, icon: icon_user_path(@current_user)} and return
  end

  def clear
    log_out
    render json: {} and return
  end
end
