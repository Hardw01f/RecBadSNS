class PasswordResetController < ApplicationController
  def create
    begin
      user = User.find_by email: params[:email]
      reset_token = generate_reset_token(user)
      UserMailer.with(user: user, url: request.base_url, reset_token: reset_token).password_reset.deliver_later
      render json: {} and return
    rescue
      render json: {errors: ['トークンの発行に失敗しました']}, status: :bad_request and return
    end
  end

  def update
    begin
      payload = decode_reset_token(params[:reset_token])
      user = User.find payload[:id]
      if params[:pass].empty? then
        render json: {errors: ['パスワードのリセットに失敗しました']}, status: :bad_request and return
      end
      user.update(pass: Digest::MD5.hexdigest(params[:pass]))
      log_in user
      render json: {name: user.name, icon: icon_user_path(user)} and return
    rescue
      render json: {errors: ['パスワードのリセットに失敗しました']}, status: :bad_request and return
    end
  end

  private

  def generate_reset_token(user)
    cipher = OpenSSL::Cipher.new('aes-256-ecb')
    cipher.encrypt
    cipher.key = Rails.application.secrets.secret_key_base.slice(0, 32)

    payload = [user.id, user.login_id, user.name, user.email].join(':')
    Base64.urlsafe_encode64(cipher.update(payload) + cipher.final)
  end

  def decode_reset_token(reset_token)
    cipher = OpenSSL::Cipher.new('aes-256-ecb')
    cipher.decrypt
    cipher.key = Rails.application.secrets.secret_key_base.slice(0, 32)

    payload = cipher.update(Base64.urlsafe_decode64(reset_token)) + cipher.final
    id, login_id, name, email = payload.split(':')
    {id: id, login_id: login_id, name: name, email: email}
  end
end
